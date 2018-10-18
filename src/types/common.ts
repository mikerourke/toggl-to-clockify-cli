export enum ToolName {
  Clockify = 'clockify',
  Toggl = 'toggl',
}

export interface GeneralWorkspace {
  name: string;
  id?: string | number;
  years?: number[];
}

export interface ConfigWorkspace extends GeneralWorkspace {
  years: number[];
}

export interface Config {
  email: string;
  togglApiToken: string;
  clockifyApiToken: string;
  workspaces: { name: string; years: number[] }[];
}

export enum EntityGroup {
  Clients = 'clients',
  Projects = 'projects',
  Tags = 'tags',
  TimeEntries = 'timeEntries',
}
