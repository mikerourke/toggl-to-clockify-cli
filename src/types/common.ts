export enum ToolName {
  Clockify = 'clockify',
  Toggl = 'toggl',
}

export interface GeneralWorkspace {
  name: string;
  id?: string;
  years: number[];
}
