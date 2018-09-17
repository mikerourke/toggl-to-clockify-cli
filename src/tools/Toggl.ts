// TODO: Add additional comments and logging.

import * as qs from 'querystring';
import chalk from 'chalk';
import { format, isSameYear, lastDayOfYear } from 'date-fns';
import { find, flatten, property, range, reverse, sortBy } from 'lodash';
import config from 'config';
import fetch from 'node-fetch';
import JsonFile from '../utils/JsonFile';

enum ContextUrl {
  Reports = 'https://toggl.com/reports/api/v2',
  Toggl = 'https://www.toggl.com/api/v8',
}

interface Workspace {
  id: string;
  name: string;
  years: number[];
}

interface TogglConfig {
  apiToken: string;
  email: string;
  workspaces: Partial<Workspace>[];
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

  private async getDetailedReportForWorkspace(
    workspace: Workspace,
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

  private async extrapolatePagination(
    workspace: Workspace,
    activeYear: number,
  ) {
    const { per_page, total_count } = await this.getDetailedReportForWorkspace(
      workspace,
      activeYear,
    );
    return Math.ceil(total_count / per_page);
  }

  private async getWorkspaceTimeEntriesForYear(
    workspace: Workspace,
    activeYear: number,
  ) {
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
    return flatten(pageEntries);
  }

  private async getTimeEntriesForWorkspace(workspace: Workspace) {
    const timeEntriesForYear = await Promise.all(
      workspace.years.map(activeYear =>
        this.getWorkspaceTimeEntriesForYear(workspace, activeYear),
      ),
    );

    // Sort descending by date:
    const sortedEntries = sortBy(flatten(timeEntriesForYear), 'start');
    return reverse(sortedEntries);
  }

  private async getProjectsInWorkspace(workspace: Workspace) {
    return await this.makeApiRequest(
      ContextUrl.Toggl,
      `/workspaces/${workspace.id}/projects`,
    );
  }

  private async getEntitiesInWorkspace(workspace: Workspace) {
    const timeEntries = await this.getTimeEntriesForWorkspace(workspace);
    const projects = await this.getProjectsInWorkspace(workspace);
    return {
      workspaceName: workspace.name,
      projects,
      timeEntries,
    };
  }

  private async getWorkspaces() {
    const results = await this.makeApiRequest(ContextUrl.Toggl, '/workspaces');

    // Only return workspaces specified in config file:
    return results.reduce((acc, { id, name }) => {
      const configWorkspace = find(this.togglConfig.workspaces, {
        name,
      }) as any;

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

  public async writeDataToJson() {
    const workspaces = await this.getWorkspaces();
    const entitiesByWorkspace = await Promise.all(
      workspaces.map(workspace => this.getEntitiesInWorkspace(workspace)),
    );

    const dataToWrite = entitiesByWorkspace.reduce(
      (acc, { workspaceName, ...rest }: any) => ({
        ...acc,
        [workspaceName]: rest,
      }),
      {},
    );

    const jsonFile = new JsonFile('toggl.json');
    await jsonFile.write(dataToWrite);
    console.log(chalk.green('Done'));
  }
}
