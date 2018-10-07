// TODO: Update functionality to match Toggl entries when fetching JSON data.
import chalk from 'chalk';
import fetch from 'node-fetch';
import { drop, get, isNil, take } from 'lodash';
import Config from '../utils/Config';
import JsonFile from '../utils/JsonFile';
import { GeneralWorkspace } from '../types/common';
import {
  CreateProjectRequest as ClockifyProjectRequest,
  CreateTimeEntryRequest as ClockifyTimeEntryRequest,
  ProjectDtoImpl as ClockifyProjectResponse,
} from '../types/clockify';
import {
  ProjectResponse as TogglProject,
  TimeEntryResponse as TogglTimeEntry,
  TogglData,
} from '../types/toggl';

// TypeScript polyfill for async iterator:
if (!(Symbol as any)['asyncIterator']) {
  (Symbol as any)['asyncIterator'] = Symbol();
}

const BATCH_STEP = 25;

/**
 * Performs actions associated with the Clockify API and provides functionality
 *    to transfer Toggl data to Clockify.
 */
export default class Clockify {
  private batchIndex: number;
  private projectsByName: Record<string, string>;
  private readonly apiToken: string;
  private togglData: TogglData;

  constructor(configFilePath: string) {
    const settings = Config.loadSettingsFromFile(configFilePath);

    this.apiToken = settings.clockifyApiToken;
    this.batchIndex = 0;
    this.projectsByName = {};
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
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'X-Api-Key': this.apiToken,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.log(chalk.red(`Error encountered: ${error}`));
      return Promise.reject();
    }
  }

  /**
   * Creates a new entry within the specified workspace.
   * @param workspace Workspace to add time entry to.
   * @param clockifyTimeEntry Time entry record to add to workspace.
   */
  private async createNewClockifyTimeEntry(
    workspace: GeneralWorkspace,
    clockifyTimeEntry: ClockifyTimeEntryRequest,
  ) {
    return await this.makeApiRequest(
      `/workspaces/${workspace.id}/timeEntries/`,
      {
        method: 'POST',
        body: JSON.stringify(clockifyTimeEntry),
      },
    );
  }

  /**
   * Pauses execution for the specified number of seconds.
   * @param seconds Number of seconds to pause for.
   */
  private pause(seconds: number): Promise<void> {
    console.log(chalk.yellow(`Pausing for ${seconds} seconds...`));
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
  private async *createEntryBatch(
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

      console.log(
        chalk.cyan(
          `Creating batch for records ${recordsStart} - ${recordsEnd}...`,
        ),
      );
      await Promise.all(
        batchEntries.map(clockifyEntry =>
          this.createNewClockifyTimeEntry(workspace, clockifyEntry),
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
      [workspace.name, 'timeEntries'],
      [],
    );

    const newClockifyEntries = togglTimeEntries.map(
      (togglEntry: TogglTimeEntry) => ({
        start: new Date(togglEntry.start),
        end: new Date(togglEntry.end),
        description: togglEntry.description,
        billable: togglEntry.is_billable.toString(),
        projectId: this.projectsByName[togglEntry.project],
        taskId: '',
        tagIds: [],
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

    for await (const newBatchIndex of this.createEntryBatch(
      workspace,
      validEntries,
    )) {
      this.batchIndex = newBatchIndex;
      if (newBatchIndex === batchCount) break;
    }
  }

  /**
   * Get Clockify projects from API and assign map of IDs by project name to
   *    the projectsByName property.
   * @param workspace Workspace containing projects.
   */
  private async loadClockifyProjectsByName(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    const results = await this.makeApiRequest(
      `/workspaces/${workspace.id}/projects/?limit=200`,
    );
    this.projectsByName = results.reduce(
      (acc, { id, name }: ClockifyProjectResponse) => ({
        ...acc,
        [name]: id,
      }),
      {},
    );
  }

  /**
   * Submit request to Clockify API to create a new project.
   * @param workspace Workspace containing project.
   * @param clockifyProject Details for Clockify project to create.
   */
  private async createClockifyProjectRequest(
    workspace: GeneralWorkspace,
    clockifyProject: ClockifyProjectRequest,
  ): Promise<void> {
    await this.makeApiRequest(`/workspaces/${workspace.id}/projects/`, {
      method: 'POST',
      body: JSON.stringify(clockifyProject),
    });
  }

  /**
   * Creates Clockify projects matching Toggl projects for the corresponding
   *    workspace.
   * @param workspace Workspace containing projects.
   */
  private async transferProjectsFromToggl(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    const clockifyProjectNames = Object.keys(this.projectsByName);
    const togglProjects = get(this.togglData, [workspace.name, 'projects'], []);

    // Only create projects on Clockify that don't already exist:
    const projectsToCreate = togglProjects.filter(
      ({ name }) => !clockifyProjectNames.includes(name),
    );
    if (projectsToCreate.length === 0) return Promise.resolve();

    // Build array of valid Clockify projects (for API request):
    const newClockifyProjects = projectsToCreate.map(
      (togglProject: TogglProject) => ({
        name: togglProject.name,
        clientId: '',
        isPublic: false,
        estimate: '0',
        color: togglProject.hex_color,
        billable: togglProject.billable.toString(),
      }),
    );

    await Promise.all(
      newClockifyProjects.map((clockifyProject: ClockifyProjectRequest) =>
        this.createClockifyProjectRequest(workspace, clockifyProject),
      ),
    );
    await this.loadClockifyProjectsByName(workspace);
  }

  /**
   * Transfers Toggl projects and entries to Clockify.
   * @param workspace Workspace containing projects/time entries.
   */
  private async transferTogglDataToClockifyWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<void> {
    await this.loadClockifyProjectsByName(workspace);
    await this.transferProjectsFromToggl(workspace);
    await this.transferTimeEntriesFromToggl(workspace);
  }

  /**
   * Returns the Clockify workspaces. If they don't match the name of the
   *    Toggl workspaces, the entries won't be created on Clockify.
   */
  private async getWorkspaces(): Promise<GeneralWorkspace[]> {
    const results = await this.makeApiRequest('/workspaces/');
    return results.map(({ id, name }) => ({ id, name }));
  }

  /**
   * Populate the private `togglData` variable with the contents of the JSON
   *    file created in the Toggl class.
   */
  private async loadTogglDataFromJson(): Promise<void> {
    const jsonFile = new JsonFile('toggl.json');
    this.togglData = (await jsonFile.read()) as TogglData;
  }

  /**
   * Fetches Clockfify projects and time entries for specified workspace from
   *    API, removes unneeded fields, and returns object with entities and
   *    workspace name.
   * @param workspace Workspace containing projects/time entries.
   */
  private async getClockifyDataForWorkspace(workspace: GeneralWorkspace) {
    const projectsFromApi = await this.makeApiRequest(
      `/workspaces/${workspace.id}/projects/`,
    );
    const timeEntriesFromApi = await this.makeApiRequest(
      `/workspaces/${workspace.id}/timeEntries/`,
    );
    const projects = projectsFromApi.map(({ memberships, ...rest }) => rest);
    const timeEntries = timeEntriesFromApi.map(
      ({ user, project, timeInterval, ...rest }) => ({
        ...rest,
        ...timeInterval,
      }),
    );

    return {
      projects,
      timeEntries,
      workspaceName: workspace.name,
    };
  }

  /**
   * Fetches projects and time entries from Clockify API and writes to
   *    /data/clockify.json. This is used for reference only and not required
   *    to transfer data to Toggl (which is why there is no accommodation for
   *    rate limiting).
   */
  public async writeDataToJson(targetPath: string): Promise<void> {
    console.log(chalk.cyan('Fetching workspaces from Clockify...'));
    const workspaces = await this.getWorkspaces();
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

    console.log(chalk.cyan('Writing Clockify data to JSON file...'));
    const jsonFile = new JsonFile(targetPath);
    await jsonFile.write(dataToWrite);
    console.log(chalk.green('Clockify processing complete'));
  }

  /**
   * Pulls the data in from the `toggl.json` file, creates valid Clockify time
   *    entries from the results, and submits the new entries to the Clockify
   *    API for each workspace.
   */
  public async transferAllDataFromToggl(): Promise<void> {
    await this.loadTogglDataFromJson();
    const workspaces = await this.getWorkspaces();
    await Promise.all(
      workspaces.map(workspace =>
        this.transferTogglDataToClockifyWorkspace(workspace),
      ),
    );
    console.log(chalk.green('Clockify processing complete'));
  }
}
