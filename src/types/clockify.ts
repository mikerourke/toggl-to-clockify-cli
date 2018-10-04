export enum UserRole {
  User = 'USER',
  Manager = 'MANAGER',
  Admin = 'ADMIN',
}

export enum UserStatus {
  Active = 'ACTIVE',
  PendingEmailVerification = 'PENDING_EMAIL_VERIFICATION',
  Deleted = 'DELETED',
}

interface AddUserRequestBase {
  userId: string;
  userGroupIds: string[];
}

export type AddUserToUserGroupRequest = AddUserRequestBase;

export type AddUsersToProjectRequest = AddUserRequestBase;

export interface AddUsersToWorkspaceRequest {
  emails: string[];
}

export enum MembershipStatus {
  Pending = 'PENDING',
  Active = 'ACTIVE',
  Declined = 'DECLINED',
  Inactive = 'INACTIVE',
}

export interface MembershipDto {
  hourlyRate: HourlyRateDto;
  membershipStatus: MembershipStatus;
  membershipType: string;
  target: string;
  userId: string;
}

interface WithName {
  name: string;
}

interface AuthBase extends WithName {
  id: string;
  refreshToken: string;
  status: UserStatus;
  token: string;
}

export interface AuthDto extends AuthBase {
  key: string;
  memberships: MembershipDto[];
  new: boolean;
  roles: UserRole[];
}

interface WithEmail {
  email: string;
}

export interface AuthResponse extends AuthBase, WithEmail {
  isNew: boolean;
  membership: MembershipDto[];
  new: boolean;
}

export interface AuthenticationRequest extends WithEmail {
  password: string;
}

export type ChangeEmailRequest = WithEmail;

export interface ClientDto extends WithName {
  id: string;
  workspaceId: string;
}

export type ClientRequest = WithName;

export interface CreateProjectRequest extends WithName {
  clientId: string;
  isPublic: boolean;
  estimate: string;
  color: string;
  billable: boolean;
}

interface TimePeriod {
  start: string;
  end: string;
}

export interface CreateTimeEntryRequest extends TimePeriod {
  billable: boolean;
  description: string;
  projectId: string;
  taskId: string;
  tagIds: string[];
}

export type TimeEntryStartEndRequest = TimePeriod;

export type CreateUserGroupRequest = WithName;

export type CreateWorkspaceRequest = WithName;

export enum EstimateType {
  Auto = 'AUTO',
  Manual = 'MANUAL',
}

export interface EstimateDto {
  estimate: string;
  type: EstimateType;
}

export interface GetSummaryReportRequest {
  archived: string;
  billable: string;
  clientIds: string[];
  clients: string[];
  description: string;
  endDate: string;
  includeTimeEntries: boolean;
  me: boolean;
  projectIds: string[];
  projects: string[];
  roundingOn: boolean;
  startDate: string;
  tagIds: string[];
  tags: string[];
  taskIds: string[];
  tasks: string[];
  timeEntryDescription: string;
  userGroupIds: string[];
  userIds: string[];
  zoomLevel: string;
}

export interface HourlyRateDto {
  amount: number;
  currency: string;
}

export type HourlyRateRequest = HourlyRateDto;

export interface InvitationDto {
  creation: string;
  invitationCode: string;
  membership: MembershipDto;
  workspaceId: string;
  workspaceName: string;
}

export interface InvitedUserDto extends WithEmail {
  id: string;
  invitation: InvitationDto;
  memberships: MembershipDto[];
}

export interface ProjectDtoImpl extends WithName {
  archived: boolean;
  billable: boolean;
  clientId: string;
  color: string;
  estimate: EstimateDto;
  hourlyRate: HourlyRateDto;
  id: string;
  memberships: MembershipDto[];
  public: boolean;
  workspaceId: string;
}

export interface ProjectFullDto extends ProjectDtoImpl {
  tasks: TaskDto[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export enum ReportType {
  Summary = 'SUMMARY',
  Detailed = 'DETAILED',
  Weekly = 'WEEKLY',
}

interface ReportBase extends WithName, TimePeriod {
  archived: string;
  billable: string;
  clientIds: string[];
  clients: string[];
  description: string;
  group: string;
  projectIds: string[];
  projects: string[];
  roundingOn: boolean;
  subgroup: string;
  tagIds: string[];
  tags: string[];
  taskIds: string[];
  tasks: string[];
  type: ReportType;
  userId: string;
  userIds: string[];
  users: string[];
  visibleToUserGroup: string;
  zoomLevel: string;
}

export interface ReportDto extends ReportBase {
  endDate: string;
  id: string;
  public: boolean;
  startDate: string;
  workspaceId: string;
}

export interface ReportLink {
  isPublic: boolean;
  link: string;
  reportId: string;
  reportName: string;
  visibleToUserGroup: string;
}

export interface Round {
  minutes: string;
  round: string;
}

export interface SaveReportRequest extends ReportBase {
  isPublic: boolean;
}

export interface SavedSummaryReportDto {
  clients: ClientDto[];
  endDate: string;
  group: string;
  projects: ProjectFullDto[];
  reportType: string;
  startDate: string;
  subgroup: string;
  summaryReport: SummaryReportDto;
  users: UserDto[];
  workspace: WorkspaceDto;
  zoomLevel: string;
}

interface SummaryReportDto {
  dateAndTotalBillableTime: any;
  dateAndTotalNotBillableTime: any;
  projectAndTotalTime: any;
  totalTime: string;
  workspaceId: string;
}

export interface SummaryReportSettingsDto {
  group: string;
  subgroup: string;
}

export interface TagDto extends WithName {
  id: string;
  workspaceId: string;
}

export type TagRequest = WithName;

export enum TaskStatus {
  Active = 'ACTIVE',
  Done = 'DONE',
}

export interface TaskDto extends WithName {
  assigneeId: string;
  estimate: string;
  id: string;
  projectId: string;
  status: TaskStatus;
}

export type TaskRequest = TaskDto;

export type TimeEntriesDuration = TimePeriod;

export interface TimeEntriesListDto {
  allEntriesCount: number;
  gotAllEntries: boolean;
  timeEntriesList: TimeEntryDtoImpl[];
}

interface BaseTimeEntryDto {
  billable: boolean;
  description: string;
  id: string;
  isLocked: boolean;
  projectId: string;
  timeInterval: TimeIntervalDto;
  workspaceId: string;
}

export interface TimeEntryDtoImpl extends BaseTimeEntryDto {
  tagIds: string[];
  taskId: string;
  userId: string;
}

export interface TimeEntryFullDto extends BaseTimeEntryDto {
  hourlyRate: HourlyRateDto;
  project: ProjectDtoImpl;
  tags: TagDto[];
  task: TaskDto;
  totalBillable: number;
  user: UserDto;
}

export interface TimeIntervalDto extends TimePeriod {
  duration: string;
}

export interface UpdateProjectRequest extends WithName {
  hourlyRate: HourlyRateRequest;
  clientId: string;
  billable: boolean;
  isPublic: boolean;
  estimate: EstimateDto;
  color: string;
}

export interface UpdateReportRequest extends WithName {
  isPublic: boolean;
  visibleToUserGroup: string;
}

export type UpdateRoundRequest = Round;

export interface UpdateTimeEntryRequest extends TimePeriod {
  billable: boolean;
  description: string;
  projectId: string;
  taskId: string;
  tagIds: string[];
}

export type UpdateUserGroupNameRequest = WithName;

export interface UpdateUserSettingsRequest extends WithName {
  profilePictureUrl: string;
  settings: UserSettingsDto;
  profilePicture: string;
}

export interface UpdateWorkspaceRequest extends WithName {
  hourlyRate: HourlyRateRequest;
  workspaceSettings: UpdateWorkspaceSettingsRequest;
  imageUrl: string;
}

export interface UpdateWorkspaceSettingsRequest {
  canSeeTimeSheet: boolean;
  defaultBillableProjects: boolean;
  forceDescription: boolean;
  forceProjects: boolean;
  forceTags: boolean;
  forceTasks: boolean;
  lockedTimeEntries: string;
  lockTimeEntries: string;
  onlyAdminsCreateProject: boolean;
  onlyAdminsSeeAllTimeEntries: boolean;
  onlyAdminsSeeBillableRates: boolean;
  onlyAdminsSeeDashboard: boolean;
  onlyAdminsSeePublicProjectsEntries: boolean;
  projectFavorite: boolean;
  projectFavorites: boolean;
  projectPickerSpecialFilter: boolean;
  round: UpdateRoundRequest;
  timeRoundingInReports: boolean;
}

export interface UserChangesPasswordRequest {
  oldPassword: string;
  newPassword: string;
  newPasswordRepeated: string;
}

export interface UserDto {
  activeWorkspace: string;
  defaultWorkspace: string;
  email: string;
  id: string;
  memberships: MembershipDto[];
  name: string;
  profilePicture: string;
  settings: UserSettingsDto;
  status: UserStatus;
}

export interface UserGroupDto extends WithName {
  id: string;
  userIds: string[];
  workspaceId: string;
}

export enum WeekDay {
  Monday = 'MONDAY',
  Tuesday = 'TUESDAY',
  Wednesday = 'WEDNESDAY',
  Thursday = 'THURSDAY',
  Friday = 'FRIDAY',
  Saturday = 'SATURDAY',
  Sunday = 'SUNDAY',
}

export interface UserSettingsDto {
  dateFormat: string;
  isCompactViewOn: boolean;
  longRunning: boolean;
  sendNewsletter: boolean;
  summaryReportSettings: SummaryReportSettingsDto;
  timeFormat: string;
  timeTrackingManual: boolean;
  timeZone: string;
  weekStart: WeekDay;
  weeklyUpdates: boolean;
}

export interface WorkspaceDto extends WithName {
  hourlyRate: HourlyRateDto;
  id: string;
  imageUrl: string;
  memberships: MembershipDto[];
  workspaceSettings: WorkspaceSettingsDto;
}

export interface WorkspaceSettingsDto {
  canSeeTimeSheet: boolean;
  defaultBillableProjects: boolean;
  forceDescription: boolean;
  forceProjects: boolean;
  forceTags: boolean;
  forceTasks: boolean;
  lockTimeEntries: string;
  onlyAdminsCreateProject: boolean;
  onlyAdminsSeeAllTimeEntries: boolean;
  onlyAdminsSeeBillableRates: boolean;
  onlyAdminsSeeDashboard: boolean;
  onlyAdminsSeePublicProjectsEntries: boolean;
  projectFavorites: boolean;
  projectPickerSpecialFilter: boolean;
  round: Round;
  timeRoundingInReports: boolean;
}
