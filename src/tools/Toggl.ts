import * as qs from 'querystring';
import chalk from 'chalk';
import { format, isSameYear, lastDayOfYear } from 'date-fns';
import { find, flatten, property, range, reverse, sortBy } from 'lodash';
import config from 'config';
import fetch from 'node-fetch';
import JsonFile from '../utils/JsonFile';
import {
  TimeEntryResponse,
  WorkspaceEntities,
  WorkspaceResponse,
} from '../types/toggl';

enum ContextUrl {
  Reports = 'https://toggl.com/reports/api/v2',
  Toggl = 'https://www.toggl.com/api/v8',
}

interface WorkspaceFromConfig {
  id: string;
  name: string;
  years: number[];
}

interface TogglConfig {
  apiToken: string;
  email: string;
  workspaces: Partial<WorkspaceFromConfig>[];
}

interface WorkspaceDetails extends WorkspaceEntities {
  workspaceName: string;
}

/**
 * Performs required functions associated with Toggl.
 * @class
 */
export default class Toggl {
  private readonly togglConfig: TogglConfig;

  constructor() {
    this.togglConfig = {
      apiToken: config.get('toggl.apiToken'),
      email: config.get('toggl.email'),
      workspaces: config.get('workspaces'),
    };
  }

  /**
   * Performs `fetch` call to Toggl API with the appropriate headers, endpoint,
   *    and authorization.
   * @param contextUrl Base URL to make requests to (Reports or Toggl).
   * @param endpoint Endpoint for fetch call (prefixed with base URL).
   */
  private async makeApiRequest(contextUrl: ContextUrl, endpoint: string) {
    const authString = `${this.togglConfig.apiToken}:api_token`;
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
   * @param workspace Workspace containing projects/time entries.
   * @param activeYear Limiting year for report records.
   * @param page Page for report records.
   */
  private async getDetailedReportForWorkspace(
    workspace: WorkspaceFromConfig,
    activeYear: number,
    page: number = 1,
  ) {
    const queryString = qs.stringify({
      workspace_id: workspace.id,
      user_agent: this.togglConfig.email,
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
   * @param workspace Workspace containing projects/time entries.
   * @param activeYear Limiting year for report records.
   */
  private async extrapolatePagination(
    workspace: WorkspaceFromConfig,
    activeYear: number,
  ): Promise<number> {
    const { per_page, total_count } = await this.getDetailedReportForWorkspace(
      workspace,
      activeYear,
    );
    return Math.ceil(total_count / per_page);
  }

  /**
   * Returns an array of Toggl entries from the API that correspond with the
   *    specified year.
   * @param workspace Workspace containing projects/time entries.
   * @param activeYear Limiting year for report records.
   */
  private async getWorkspaceTimeEntriesForYear(
    workspace: WorkspaceFromConfig,
    activeYear: number,
  ): Promise<TimeEntryResponse[]> {
    const totalPageCount = await this.extrapolatePagination(
      workspace,
      activeYear,
    );
    const pages = range(1, totalPageCount + 1);

    const dataForAllPages = await Promise.all(
      pages.map(page =>
        this.getDetailedReportForWorkspace(workspace, activeYear, page),
      ),
    );
    const pageEntries = dataForAllPages.map(property('data'));
    return flatten(pageEntries) as TimeEntryResponse[];
  }

  /**
   * Returns all Toggl time entries for the specified workspace (for all years).
   * @param workspace Workspace containing projects/time entries.
   */
  private async getTimeEntriesForWorkspace(
    workspace: WorkspaceFromConfig,
  ): Promise<TimeEntryResponse[]> {
    const timeEntriesForYear = await Promise.all(
      workspace.years.map(activeYear =>
        this.getWorkspaceTimeEntriesForYear(workspace, activeYear),
      ),
    );

    // Sort descending by date:
    const sortedEntries = sortBy(flatten(timeEntriesForYear), 'start');
    return reverse(sortedEntries);
  }

  /**
   * Fetches projects from the Toggl API for the specified workspace.
   * @param workspace Workspace containing projects/time entries.
   */
  private async getProjectsInWorkspace(workspace: WorkspaceFromConfig) {
    return await this.makeApiRequest(
      ContextUrl.Toggl,
      `/workspaces/${workspace.id}/projects`,
    );
  }

  /**
   * Fetches time entries and projects from the specified Toggl workspace.
   * @param workspace
   */
  private async getWorkspaceDetails(
    workspace: WorkspaceFromConfig,
  ): Promise<WorkspaceDetails> {
    console.log(
      chalk.cyan(
        `Fetching time entries and projects in workspace: ${workspace.name}...`,
      ),
    );
    const timeEntries = await this.getTimeEntriesForWorkspace(workspace);
    const projects = await this.getProjectsInWorkspace(workspace);
    return {
      workspaceName: workspace.name,
      projects,
      timeEntries,
    };
  }

  /**
   * Fetches Toggl workspaces and returns array of records with ID, name, and
   *    associated contents from config file.
   */
  private async getWorkspaces(): Promise<WorkspaceFromConfig[]> {
    const results = await this.makeApiRequest(ContextUrl.Toggl, '/workspaces');

    // Only return workspaces specified in config file:
    return results.reduce((acc, { id, name }: WorkspaceResponse) => {
      const configWorkspace = find(this.togglConfig.workspaces, {
        name,
      }) as WorkspaceFromConfig;

      if (!configWorkspace) return acc;

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

  /**
   * Writes projects and time entries for all workspaces to toggl.json in the
   *    /data directory.
   */
  public async writeDataToJson(): Promise<void> {
    console.log(chalk.cyan('Fetching workspaces from Toggl...'));
    const workspaces = await this.getWorkspaces();
    const entitiesByWorkspace = await Promise.all(
      workspaces.map(workspace => this.getWorkspaceDetails(workspace)),
    );

    const dataToWrite = entitiesByWorkspace.reduce(
      (acc, { workspaceName, ...rest }: WorkspaceDetails) => ({
        ...acc,
        [workspaceName]: rest,
      }),
      {},
    );

    console.log(chalk.cyan('Writing Toggl data to /data/toggl.json...'));
    const jsonFile = new JsonFile('toggl.json');
    await jsonFile.write(dataToWrite);
    console.log(chalk.green('Toggl processing complete'));
  }
}
