import * as qs from 'querystring';
import chalk from 'chalk';
import { format, isSameYear, lastDayOfYear } from 'date-fns';
import { flatten, get, isNil, reverse, sortBy, uniq } from 'lodash';
import fetch from 'node-fetch';
import ConfigFile from '../utils/ConfigFile';
import JsonFile from '../utils/JsonFile';
import { Config, ConfigWorkspace, GeneralWorkspace } from '../types/common';
import {
  ClientResponse,
  ProjectResponse,
  TimeEntryResponse,
  WorkspaceEntities,
  WorkspaceResponse,
} from '../types/toggl';

enum ContextUrl {
  Reports = 'https://toggl.com/reports/api/v2',
  Toggl = 'https://www.toggl.com/api/v8',
}

interface WorkspaceDetails extends WorkspaceEntities {
  workspaceName: string;
}

/**
 * Performs required functions associated with Toggl.
 * @class
 */
export default class Toggl {
  private readonly config: Config;
  private currentPage: number;
  private workspaceIndex: number;
  private yearIndex: number;

  constructor(configFilePath: string) {
    this.config = ConfigFile.loadEntriesFromFile(configFilePath);
    this.currentPage = 1;
    this.workspaceIndex = 0;
    this.yearIndex = 0;
  }

  /**
   * Performs `fetch` call to Toggl API with the appropriate headers, endpoint,
   *    and authorization.
   * @param contextUrl Base URL to make requests to (Reports or Toggl).
   * @param endpoint Endpoint for fetch call (prefixed with base URL).
   */
  private async makeApiRequest(contextUrl: ContextUrl, endpoint: string) {
    const authString = `${this.config.togglApiToken}:api_token`;
    const encodedAuth = Buffer.from(authString).toString('base64');
    const fullUrl = `${contextUrl}${endpoint}`;
    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
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

  private printStatus(message: string) {
    console.log(chalk.cyan(message));
  }

  /**
   * Returns an object with date ranges that get passed to the fetch call. It
   *    should either return from the first day of the year for since and the
   *    last day of the year if the `activeYear` specified is a previous year,
   *    otherwise it sets `until` to the current date.
   * @param activeYear Current year to fetch data for (this changes as more
   *    data is fetched).
   */
  private getDateRangesForYear(activeYear: number) {
    const now = new Date();
    now.setFullYear(activeYear);
    const firstDayOfYear = new Date(activeYear, 0, 1);

    const untilDate = isSameYear(now, firstDayOfYear)
      ? now
      : lastDayOfYear(now);

    return {
      since: format(firstDayOfYear, 'YYYY-MM-DD'),
      until: format(untilDate, 'YYYY-MM-DD'),
    };
  }

  /**
   * Fetches data from Toggl Reports API and returns details based on specified
   *    year and page number.
   * @param workspace Workspace to fetch data for.
   * @param activeYear Limiting year for report records.
   * @param page Page for report records.
   */
  private async getDetailedReportForWorkspace(
    workspace: GeneralWorkspace,
    activeYear: number,
    page: number = 1,
  ) {
    const queryString = qs.stringify({
      workspace_id: workspace.id,
      user_agent: this.config.email,
      page,
      ...this.getDateRangesForYear(activeYear),
    });

    return await this.makeApiRequest(
      ContextUrl.Reports,
      `/details?${queryString}`,
    );
  }

  /**
   * Returns the page count for the specified year
   * @param workspace Workspace to fetch data for.
   * @param activeYear Limiting year for report records.
   */
  private async extrapolatePagination(
    workspace: GeneralWorkspace,
    activeYear: number,
  ): Promise<number> {
    const { per_page, total_count } = await this.getDetailedReportForWorkspace(
      workspace,
      activeYear,
    );
    return Math.ceil(total_count / per_page);
  }

  private async *getTimeEntriesForYearIterable(
    workspace: GeneralWorkspace,
    activeYear: number,
  ): AsyncIterableIterator<TimeEntryResponse[]> {
    while (true as any) {
      const timeEntries = await this.getDetailedReportForWorkspace(
        workspace,
        activeYear,
        this.currentPage,
      );
      await this.pause();
      this.currentPage += 1;
      yield timeEntries.data as TimeEntryResponse[];
    }
  }

  private printTimeEntriesStatus(workspaceName: string, activeYear: number) {
    this.printStatus(
      `Getting time entries for page ${this.currentPage} for ` +
        `${workspaceName} for the year of ${activeYear}...`,
    );
  }

  /**
   * Returns an array of Toggl entries from the API that correspond with the
   *    specified year.
   * @param workspace Workspace to fetch data for.
   * @param activeYear Limiting year for report records.
   */
  private async getWorkspaceTimeEntriesForYear(
    workspace: GeneralWorkspace,
    activeYear: number,
  ): Promise<TimeEntryResponse[]> {
    const totalPageCount = await this.extrapolatePagination(
      workspace,
      activeYear,
    );

    const entriesForAllPages: any = [];

    // Ensure the first page is printed:
    this.printTimeEntriesStatus(workspace.name, activeYear);

    for await (const timeEntriesForPage of this.getTimeEntriesForYearIterable(
      workspace,
      activeYear,
    )) {
      this.printTimeEntriesStatus(workspace.name, activeYear);
      entriesForAllPages.push(timeEntriesForPage);
      if (
        timeEntriesForPage.length === 0 ||
        this.currentPage === totalPageCount
      ) {
        this.currentPage = 1;
        break;
      }
    }

    return flatten(entriesForAllPages) as TimeEntryResponse[];
  }

  private async *getTimeEntriesForWorkspaceIteratable(
    workspace: ConfigWorkspace,
  ) {
    while (true as any) {
      const yearEntries = await this.getWorkspaceTimeEntriesForYear(
        workspace,
        workspace.years[this.yearIndex],
      );
      await this.pause();
      yield yearEntries;
    }
  }

  /**
   * Returns all Toggl time entries for the specified workspace (for all years).
   * @param workspace Workspace to fetch data for.
   */
  private async getTimeEntriesForWorkspace(
    workspace: ConfigWorkspace,
  ): Promise<TimeEntryResponse[]> {
    const timeEntriesForYear: any = [];

    for await (const yearEntries of this.getTimeEntriesForWorkspaceIteratable(
      workspace,
    )) {
      timeEntriesForYear.push(yearEntries);
      this.yearIndex += 1;
      if (this.yearIndex === workspace.years.length) {
        this.yearIndex = 0;
        break;
      }
    }

    const sortedEntries: any = sortBy(flatten(timeEntriesForYear), 'start');
    return reverse(sortedEntries);
  }

  /**
   * Fetches projects from the Toggl API for the specified workspace.
   * @param workspace Workspace to fetch data for.
   */
  private async getProjectsInWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<ProjectResponse[]> {
    return await this.makeApiRequest(
      ContextUrl.Toggl,
      `/workspaces/${workspace.id}/projects`,
    );
  }

  /**
   * Fetches clients from the Toggl API for the specified workspace.
   * @param workspace Workspace to fetch data for.
   */
  private async getClientsInWorkspace(
    workspace: GeneralWorkspace,
  ): Promise<ClientResponse[]> {
    return await this.makeApiRequest(
      ContextUrl.Toggl,
      `/workspaces/${workspace.id}/clients`,
    );
  }

  private extrapolateTags(
    timeEntries: TimeEntryResponse[],
  ): { id: string; name: string }[] {
    const allTags: any = [];
    timeEntries.forEach(({ tags }) => {
      if (tags.length !== 0) allTags.push(tags);
    });
    const flattenedTags = flatten(allTags) as string[];
    return uniq(flattenedTags).map(tagName => ({ id: tagName, name: tagName }));
  }

  /**
   * Fetches time entries and projects from the specified Toggl workspace.
   * @param workspace Workspace to fetch data for.
   */
  private async getWorkspaceDetails(
    workspace: ConfigWorkspace,
  ): Promise<WorkspaceDetails> {
    this.printStatus(
      `Fetching time entries and projects in workspace: ${workspace.name}...`,
    );
    const clients = await this.getClientsInWorkspace(workspace);
    const projects = await this.getProjectsInWorkspace(workspace);
    const timeEntries = await this.getTimeEntriesForWorkspace(workspace);
    const tags = this.extrapolateTags(timeEntries);
    return {
      workspaceName: workspace.name,
      clients,
      projects,
      timeEntries,
      tags,
    };
  }

  private async *getWorkspaceDetailsIteratable(workspaces: ConfigWorkspace[]) {
    while (true as any) {
      const details = await this.getWorkspaceDetails(
        workspaces[this.workspaceIndex],
      );
      await this.pause();
      yield details;
    }
  }

  /**
   * Fetches Toggl workspaces and returns array of records with ID, name, and
   *    associated contents from config file.
   */
  private async getWorkspaces(): Promise<ConfigWorkspace[]> {
    const results = await this.makeApiRequest(ContextUrl.Toggl, '/workspaces');

    // Only return workspaces specified in config file:
    return results.reduce((acc, { id, name }: WorkspaceResponse) => {
      const configWorkspace = this.config.workspaces.find(
        workspace => get(workspace, 'name', '') === name,
      ) as GeneralWorkspace;

      if (isNil(configWorkspace)) return acc;

      return [
        ...acc,
        {
          ...configWorkspace,
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
      `that the "name" is an ${chalk.underline('exact')} match to Toggl`,
      '\n',
      'Refer to the README.md file for additional details',
    ].join('');
    console.log(chalk.red(message));
    return false;
  }

  /**
   * Writes clients, projects, and time entries for all workspaces to the
   *    specified target path.
   * @param targetPath Output path to write JSON file data.
   */
  public async writeDataToJson(targetPath: string): Promise<void> {
    this.printStatus('Fetching workspaces from Toggl...');
    const workspaces = await this.getWorkspaces();
    if (!this.validateWorkspaces(workspaces)) return Promise.resolve();

    const entitiesByWorkspace: any = [];

    this.workspaceIndex = 0;

    for await (const entitiesInWorkspace of this.getWorkspaceDetailsIteratable(
      workspaces,
    )) {
      entitiesByWorkspace.push(entitiesInWorkspace);
      this.workspaceIndex += 1;
      if (this.workspaceIndex === workspaces.length) break;
    }

    const dataToWrite = entitiesByWorkspace.reduce(
      (acc, { workspaceName, ...rest }: WorkspaceDetails) => ({
        ...acc,
        [workspaceName]: rest,
      }),
      {},
    );

    this.printStatus('Writing Toggl data to JSON file...');
    const jsonFile = new JsonFile(targetPath);
    await jsonFile.write(dataToWrite);
    console.log(chalk.green('Toggl processing complete'));
  }
}
