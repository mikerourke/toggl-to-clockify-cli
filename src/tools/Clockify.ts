// TODO: Add additional comments and logging.
import chalk from 'chalk';
import config from 'config';
import fetch from 'node-fetch';
import { drop, get, isNil, take } from 'lodash';
import JsonFile from '../utils/JsonFile';

interface Workspace {
  id: string;
  name: string;
}

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
  private togglData: any;

  constructor() {
    this.apiToken = config.get('clockify.apiToken');
    this.batchIndex = 0;
    this.projectsByName = {};
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
          ...options.headers,
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
    workspace: Workspace,
    clockifyTimeEntry: any,
  ) {
    return await this.makeApiRequest(
      `/workspaces/${workspace.id}/timeEntries/`,
      {
        method: 'POST',
        body: JSON.stringify(clockifyTimeEntry),
      },
    );
  }

  private pause(seconds: number) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }

  private async *createEntryBatch(workspace: Workspace, newEntries: any) {
    while (true as any) {
      const recordsStart = this.batchIndex * BATCH_STEP;
      const recordsEnd = recordsStart + BATCH_STEP;

      let batchEntries = drop([...newEntries], recordsStart);
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
      console.log(chalk.yellow('Pausing for 5 seconds...'));
      await this.pause(5);
      yield this.batchIndex + 1;
    }
  }

  private async transferTimeEntriesFromToggl(workspace: Workspace) {
    const togglTimeEntries = get(
      this.togglData,
      [workspace.name, 'timeEntries'],
      [],
    );

    const newClockifyEntries = togglTimeEntries.map((togglEntry: any) => ({
      start: new Date(togglEntry.start),
      end: new Date(togglEntry.end),
      description: togglEntry.description,
      billable: togglEntry.is_billable.toString(),
      projectId: this.projectsByName[togglEntry.project],
      taskId: '',
      tagIds: [],
    }));

    const validEntries = newClockifyEntries.filter(
      clockifyEntry => !isNil(clockifyEntry.projectId),
    );
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

  private async loadClockifyProjectsByName(
    workspace: Workspace,
  ): Promise<void> {
    const results = await this.makeApiRequest(
      `/workspaces/${workspace.id}/projects/?limit=200`,
    );
    this.projectsByName = results.reduce(
      (acc, { id, name }: any) => ({
        ...acc,
        [name]: id,
      }),
      {},
    );
  }

  private async createNewClockifyProject(
    workspace: Workspace,
    clockifyProject: any,
  ) {
    await this.makeApiRequest(`/workspaces/${workspace.id}/projects/`, {
      method: 'POST',
      body: JSON.stringify(clockifyProject),
    });
  }

  private async transferProjectsFromToggl(workspace: Workspace) {
    const clockifyProjectNames = Object.keys(this.projectsByName);
    const togglProjects = get(this.togglData, [workspace.name, 'projects'], []);

    const projectsToCreate = togglProjects.filter(
      ({ name }) => !clockifyProjectNames.includes(name),
    );
    if (projectsToCreate.length === 0) return Promise.resolve();

    const newClockifyProjects = projectsToCreate.map(togglProject => ({
      name: togglProject.name,
      clientId: '',
      isPublic: false,
      estimate: '0',
      color: togglProject.hex_color,
      billable: togglProject.billable.toString(),
    }));

    await Promise.all(
      newClockifyProjects.map(clockifyProject =>
        this.createNewClockifyProject(workspace, clockifyProject),
      ),
    );
    await this.loadClockifyProjectsByName(workspace);
  }

  private async transferTogglDataToClockifyWorkspace(workspace: Workspace) {
    await this.loadClockifyProjectsByName(workspace);
    await this.transferProjectsFromToggl(workspace);
    await this.transferTimeEntriesFromToggl(workspace);
  }

  private async getWorkspaces(): Promise<Workspace[]> {
    const results = await this.makeApiRequest('/workspaces/');
    return results.map(({ id, name }) => ({ id, name }));
  }

  private async loadTogglDataFromJson() {
    const jsonFile = new JsonFile('toggl.json');
    this.togglData = await jsonFile.read();
  }

  public async transferAllDataFromToggl() {
    await this.loadTogglDataFromJson();
    const workspaces = await this.getWorkspaces();
    await Promise.all(
      workspaces.map(workspace =>
        this.transferTogglDataToClockifyWorkspace(workspace),
      ),
    );
    console.log(chalk.green('Done'));
  }
}
