import chalk from 'chalk';
import fetch from 'node-fetch';
import { drop, find, get, isNil, take } from 'lodash';
import ConfigFile from '../utils/ConfigFile';
import JsonFile from '../utils/JsonFile';
import { Config, EntityGroup, GeneralWorkspace } from '../types/common';
import {
  ClientDto as ClockifyClientResponse,
  CreateProjectRequest as ClockifyProjectRequest,
  CreateTimeEntryRequest as ClockifyTimeEntryRequest,
  ProjectDtoImpl as ClockifyProjectResponse,
  TimeEntryFullDto as ClockifyTimeEntryResponse,
} from '../types/clockify';
import {
  ClientResponse as TogglClient,
  ProjectResponse as TogglProject,
  TimeEntryResponse as TogglTimeEntry,
  TogglData,
  WorkspaceResponse,
} from '../types/toggl';

const BATCH_STEP = 25;

interface EntityRecord {
  id: string;
  name: string;
  workspaceId: string;
}

interface EntityGroupsByName {
  [EntityGroup.Clients]: Record<string, string>;
  [EntityGroup.Projects]: Record<string, string>;
  [EntityGroup.Tags]: Record<string, string>;
}

/**
 * Performs actions associated with the Clockify API and provides functionality
 *    to transfer Toggl data to Clockify.
 */
export default class Clockify {
  private readonly config: Config;
  private batchIndex: number;
  private entityIndex: number;
  private workspaceIndex: number;
  private entityGroupsByName: EntityGroupsByName;
  private togglData: TogglData;

  constructor(configFilePath: string) {
    this.config = ConfigFile.loadEntriesFromFile(configFilePath);
    this.batchIndex = 0;
    this.entityIndex = 0;
    this.workspaceIndex = 0;
    this.entityGroupsByName = {
      [EntityGroup.Clients]: {},
      [EntityGroup.Projects]: {},
      [EntityGroup.Tags]: {},
    };
    this.togglData = {};
  }

  /**
   * Performs `fetch` call to Clockify API with the appropriate headers,
   *    endpoint, and authorization.
   * @param endpoint Endpoint for fetch call (prefixed with base URL).
   * @param options Options object to pass to `fetch` call.
   */
  private async makeApiRequest(endpoint: string, options: any = {}) {
    const fullUrl = `https://api.clockify.me/api${endpoint}`;
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'X-Api-Key': this.config.clockifyApiToken,
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  private printStatus(message: string) {
    console.log(chalk.cyan(message));
  }

  /**
   * Submit request to Clockify API to create a new entity.
   * @param workspace Workspace to add entity to.
   * @param entityGroup Entity group representing type to create.
   * @param clockifyEntity Details for Clockify entity to create.
   */
  private async createClockifyEntity<CreatedEntity>(
    workspace: GeneralWorkspace,
    entityGroup: EntityGroup,
    clockifyEntity: CreatedEntity,
  ): Promise<void> {
    const endpoint =
      entityGroup === EntityGroup.Clients ? entityGroup : `${entityGroup}/`;
    await this.makeApiRequest(`/workspaces/${workspace.id}/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(clockifyEntity),
    });
  }

  /**
   * Pauses execution for the specified number of seconds.
   * @param [seconds=1] Number of seconds to pause for.
   */
  private pause(seconds: number = 1): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }

  /**
   * Async iterator that creates submits a batch of Clockify time entries to the
   *    Clockify API, then pauses for a set time and continues. This is done
   *    to overcome rate limits.
   * @param workspace Workspace containing time entries.
   * @param newClockifyTimeEntries Clockify entries to create.
   */
  private async *createTimeEntryBatchIterable(
    workspace: GeneralWorkspace,
    newClockifyTimeEntries: ClockifyTimeEntryRequest[],
  ) {
    while (true as any) {
      const recordsStart = this.batchIndex * BATCH_STEP;
      const recordsEnd = recordsStart + BATCH_STEP;

      // This breaks the entries up into batches of 25. It drops records from
      // the start of the entries (based on the current batchIndex), so if the
      // batchIndex is 2, it will drop the first 50 records. Then it takes the
      // first 25 of these records and sends a request to the Clockify API to
      // create these entries.
      let batchEntries = drop([...newClockifyTimeEntries], recordsStart);
      batchEntries = take(batchEntries, BATCH_STEP);

      this.printStatus(
        `Creating time entries for records ${recordsStart} - ${recordsEnd}...`,
      );
      await Promise.all(
        batchEntries.map(clockifyEntry =>
          this.createClockifyEntity<ClockifyTimeEntryRequest>(
            workspace,
            EntityGroup.TimeEntries,
            clockifyEntry,
          ),
        ),
      );

      // Adds a 5 second pause between requests to ensure the rate limits aren't
      // hit:
      await this.pause(5);
      yield this.batchIndex + 1;
    }
  }

  /**
   * Returns array of valid Clockify entries to submit to Clockify API. The
   *    entries are built from the Toggl entries.
   * @param workspace Workspace containing time entries.
   */
  private buildValidClockifyEntries(
    workspace: GeneralWorkspace,
  ): ClockifyTimeEntryRequest[] {
    const togglTimeEntries = get(
      this.togglData,
      [workspace.name, EntityGroup.TimeEntries],
      [],
    );

    const findTagIdsForEntry = (togglEntry: TogglTimeEntry) => {
      const { tags } = togglEntry;
      if (tags.length === 0) return [];
      const tagIds = tags.map(tagName =>
        get(this.entityGroupsByName, [EntityGroup.Tags, tagName], ''),
      );
      return tagIds.filter(tagId => tagId.length > 0);
    };

    const newClockifyEntries = togglTimeEntries.map(
      (togglEntry: TogglTimeEntry) => ({
        start: new Date(togglEntry.start),
        end: new Date(togglEntry.end),
        description: togglEntry.description,
        billable: togglEntry.is_billable,
        projectId: get(this.entityGroupsByName, [
          EntityGroup.Projects,
          togglEntry.project,
        ]),
        tagIds: findTagIdsForEntry(togglEntry),
      }),
    );

    return newClockifyEntries.filter(
      clockifyEntry => !isNil(clockifyEntry.projectId),
    );
  }

  /**
   * Submits batches of requests to the Clockify API to create new time entries
   *    from Toggl entries.
   * @param workspace Workspace containing time entries.
   */
  private async transferTimeEntriesFromToggl(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    const validEntries = this.buildValidClockifyEntries(workspace);
    this.batchIndex = 0;
    const batchCount = Math.ceil(validEntries.length / BATCH_STEP);

    for await (const newBatchIndex of this.createTimeEntryBatchIterable(
      workspace,
      validEntries,
    )) {
      this.batchIndex = newBatchIndex;
      if (newBatchIndex === batchCount) break;
    }
  }

  /**
   * Get Clockify entities from API and assign map of IDs by name to
   *    the entitiesByName property.
   * @param workspace Workspace containing entities.
   * @param entityGroup Entity type to get.
   */
  private async loadClockifyEntitiesByName(
    workspace: GeneralWorkspace,
    entityGroup: EntityGroup,
  ): Promise<void> {
    const queryString =
      entityGroup === EntityGroup.Projects ? '?limit=200' : '';
    const results = await this.makeApiRequest(
      `/workspaces/${workspace.id}/${entityGroup}/${queryString}`,
    );
    this.entityGroupsByName[entityGroup] = results.reduce(
      (acc, { id, name }: EntityRecord) => ({
        ...acc,
        [name]: id,
      }),
      {},
    );
  }

  private async *createClockifyEntityIterable<CreateEntityType>(
    workspace: GeneralWorkspace,
    entityGroup: EntityGroup,
    newClockifyEntities: CreateEntityType,
  ) {
    while (true as any) {
      this.createClockifyEntity<CreateEntityType>(
        workspace,
        entityGroup,
        newClockifyEntities[this.entityIndex],
      );
      await this.pause();
      yield this.entityIndex + 1;
    }
  }

  /**
   * Creates Clockify entities matching Toggl entities for the corresponding
   *    workspace and entity group.
   * @param workspace Workspace containing entities.
   * @param entityGroup Entity group representing items to create.
   * @param recordBuilder Function used to build array of valid records.
   */
  private async transferEntitiesFromToggl<CreateEntityType>(
    workspace: GeneralWorkspace,
    entityGroup: EntityGroup,
    recordBuilder: any,
  ): Promise<void> {
    const clockifyEntityNames = Object.keys(
      this.entityGroupsByName[entityGroup],
    );

    const togglEntityRecords = get(
      this.togglData,
      [workspace.name, entityGroup],
      [],
    );

    // Only create entities on Clockify that don't already exist:
    const entitiesToCreate = togglEntityRecords.filter(
      ({ name }) => !clockifyEntityNames.includes(name),
    );
    if (entitiesToCreate.length === 0) return Promise.resolve();

    // Build array of valid Clockify entities (for API request):
    const newClockifyEntities = entitiesToCreate.map(recordBuilder);

    for await (const newEntityIndex of this.createClockifyEntityIterable(
      workspace,
      entityGroup,
      newClockifyEntities,
    )) {
      const entityName = newClockifyEntities[this.entityIndex].name;
      this.printStatus(`Creating ${entityName} in ${workspace.name}...`);

      this.entityIndex = newEntityIndex;
      if (newEntityIndex === newClockifyEntities.length) {
        this.entityIndex = 0;
        break;
      }
    }

    await this.loadClockifyEntitiesByName(workspace, entityGroup);
  }

  private async transferTagsFromToggl(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    this.entityIndex = 0;

    await this.transferEntitiesFromToggl<{ name: string }>(
      workspace,
      EntityGroup.Tags,
      ({ name }: { name: string }) => ({ name }),
    );
  }

  /**
   * Creates Clockify projects matching Toggl projects for the corresponding
   *    workspace.
   * @param workspace Workspace containing projects.
   */
  private async transferProjectsFromToggl(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    const getClientIdForProject = (togglProject: TogglProject) => {
      const { Clients } = EntityGroup;
      const togglClients = get(this.togglData, [workspace.name, Clients], []);
      const projectClient = togglClients.find(
        togglClient => togglClient.id === togglProject.cid,
      );

      if (!projectClient) return '';
      return get(this.entityGroupsByName, [Clients, projectClient.name], '');
    };

    this.entityIndex = 0;

    await this.transferEntitiesFromToggl<ClockifyProjectRequest>(
      workspace,
      EntityGroup.Projects,
      (togglProject: TogglProject) => ({
        name: togglProject.name,
        clientId: getClientIdForProject(togglProject),
        isPublic: false,
        estimate: 0,
        color: togglProject.hex_color,
        billable: togglProject.billable,
      }),
    );
  }

  private async transferClientsFromToggl(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    this.entityIndex = 0;

    await this.transferEntitiesFromToggl<{ name: string }>(
      workspace,
      EntityGroup.Clients,
      ({ name }: TogglClient) => ({ name }),
    );
  }

  /**
   * Transfers Toggl clients, projects, and time entries to Clockify.
   * @param workspace Workspace to create data in.
   */
  private async transferTogglDataToClockifyWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    const wsName = workspace.name;
    this.printStatus(`Getting clients for ${wsName}...`);
    await this.loadClockifyEntitiesByName(workspace, EntityGroup.Clients);
    await this.pause();

    this.printStatus(`Getting projects for ${wsName}...`);
    await this.loadClockifyEntitiesByName(workspace, EntityGroup.Projects);
    await this.pause();

    this.printStatus(`Getting tags for ${wsName}...`);
    await this.loadClockifyEntitiesByName(workspace, EntityGroup.Tags);
    await this.pause();

    this.printStatus(`Transferring clients to Clockify in ${wsName}...`);
    await this.transferClientsFromToggl(workspace);
    await this.pause();

    this.printStatus(`Transferring projects to Clockify in ${wsName}...`);
    await this.transferProjectsFromToggl(workspace);
    await this.pause();

    this.printStatus(`Transferring tags to Clockify in ${wsName}...`);
    await this.transferTagsFromToggl(workspace);
    await this.pause();

    this.printStatus(`Transferring time entries to Clockify in ${wsName}...`);
    await this.transferTimeEntriesFromToggl(workspace);
  }

  private async *transferWorkspaceDataIterable(workspaces: GeneralWorkspace[]) {
    while (true as any) {
      await this.transferTogglDataToClockifyWorkspace(
        workspaces[this.workspaceIndex],
      );
      await this.pause();
      yield this.workspaceIndex + 1;
    }
  }

  /**
   * Returns the Clockify workspaces. If they don't match the name of the
   *    Toggl workspaces, the entries won't be created on Clockify.
   * @param limitToConfig Indicates if workspaces should be limited to
   *    workspaces specified in the config file.
   */
  private async getWorkspaces(
    limitToConfig: boolean,
  ): Promise<GeneralWorkspace[]> {
    this.printStatus('Fetching workspaces from Clockify...');
    const results = await this.makeApiRequest('/workspaces/');

    // Only return workspaces specified in config file:
    return results.reduce((acc, { id, name }: WorkspaceResponse) => {
      if (limitToConfig) {
        const configWorkspace = find(this.config.workspaces, {
          name,
        });
        if (!configWorkspace) return acc;
      }

      return [
        ...acc,
        {
          id,
          name,
        },
      ];
    }, []);
  }

  private validateWorkspaces(workspaces: GeneralWorkspace[]) {
    if (workspaces.length > 0) return true;
    const message = [
      'No workspaces matching your configuration file were found!',
      '\n',
      'Check your configuration file to ensure you specified workspaces and ',
      `that the "name" is an ${chalk.underline('exact')} match to Clockify`,
      '\n',
      'Refer to the README.md file for additional details',
    ].join('');
    console.log(chalk.red(message));
    return false;
  }

  /**
   * Populate the private `togglData` variable with the contents of the JSON
   *    file created in the Toggl class.
   * @param togglJsonPath Path to the toggl.json path containing data.
   */
  private async loadTogglDataFromJson(togglJsonPath: string): Promise<void> {
    const jsonFile = new JsonFile(togglJsonPath);
    this.togglData = (await jsonFile.read()) as TogglData;
  }

  /**
   * Pulls the data in from the `toggl.json` file, creates valid Clockify time
   *    entries from the results, and submits the new entries to the Clockify
   *    API for each workspace.
   * @param togglJsonPath Path to the toggl.json path containing data.
   */
  public async transferAllDataFromToggl(togglJsonPath: string): Promise<void> {
    await this.loadTogglDataFromJson(togglJsonPath);
    const workspaces = await this.getWorkspaces(true);
    if (!this.validateWorkspaces(workspaces)) return Promise.resolve();

    this.workspaceIndex = 0;
    for await (const newWorkspaceIndex of this.transferWorkspaceDataIterable(
      workspaces,
    )) {
      this.workspaceIndex = newWorkspaceIndex;
      if (newWorkspaceIndex === workspaces.length) break;
    }

    console.log(chalk.green('Clockify processing complete'));
  }

  /**
   * Fetches time entries from the Clockify API for the specified workspace.
   * @param workspace Workspace to fetch data for.
   */
  private async getTimeEntriesInWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<Partial<ClockifyTimeEntryResponse>[]> {
    this.printStatus(`Fetching time entries for ${workspace.name}...`);
    try {
      const timeEntries = await this.makeApiRequest(
        `/workspaces/${workspace.id}/timeEntries/`,
      );

      return timeEntries.map(({ user, project, timeInterval, ...rest }) => ({
        ...rest,
        ...timeInterval,
      }));
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  /**
   * Fetches projects from the Clockify API for the specified workspace.
   * @param workspace Workspace to fetch data for.
   */
  private async getProjectsInWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<Partial<ClockifyProjectResponse>[]> {
    this.printStatus(`Fetching projects for ${workspace.name}...`);
    try {
      const projects = await this.makeApiRequest(
        `/workspaces/${workspace.id}/projects/`,
      );
      return projects.map(({ memberships, ...rest }) => rest);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  /**
   * Fetches clients from the Clockify API for the specified workspace.
   * @param workspace Workspace to fetch data for.
   */
  private async getClientsInWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<ClockifyClientResponse[]> {
    this.printStatus(`Fetching clients for ${workspace.name}...`);
    try {
      return await this.makeApiRequest(`/workspaces/${workspace.id}/clients/`);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  /**
   * Fetches Clockfify projects and time entries for specified workspace from
   *    API, removes unneeded fields, and returns object with entities and
   *    workspace name.
   * @param workspace Workspace to fetch data for.
   */
  private async getClockifyDataForWorkspace(workspace: GeneralWorkspace) {
    const clients = await this.getClientsInWorkspace(workspace);
    await this.pause(2);
    const projects = await this.getProjectsInWorkspace(workspace);
    await this.pause(2);
    const timeEntries = await this.getTimeEntriesInWorkspace(workspace);

    return {
      workspaceName: workspace.name,
      clients,
      projects,
      timeEntries,
    };
  }

  /**
   * Fetches projects and time entries from Clockify API and writes to
   *    specified path. This is used for reference only and not required
   *    to transfer data to Toggl (which is why there is no accommodation for
   *    rate limiting).
   */
  public async writeDataToJson(targetPath: string): Promise<void> {
    const workspaces = await this.getWorkspaces(false);
    const entitiesByWorkspace = await Promise.all(
      workspaces.map(workspace => this.getClockifyDataForWorkspace(workspace)),
    );
    const dataToWrite = entitiesByWorkspace.reduce(
      (acc, { workspaceName, ...rest }) => ({
        ...acc,
        [workspaceName]: rest,
      }),
      {},
    );

    this.printStatus('Writing Clockify data to JSON file...');
    const jsonFile = new JsonFile(targetPath);
    await jsonFile.write(dataToWrite);
    console.log(chalk.green('Clockify processing complete'));
  }
}
