declare module 'toggl' {
  export interface ReportTimeEntry {
    id: number;
    pid: number;
    tid: number | null;
    uid: number;
    description: string;
    start: string;
    end: string;
    updated: string;
    dur: number;
    user: string;
    use_stop: boolean;
    client: string;
    project: string;
    project_color: string;
    project_hex_color: string;
    task: string | null;
    billable: string | null;
    is_billable: boolean;
    cur: string | null;
    tags: string[];
  }
}
