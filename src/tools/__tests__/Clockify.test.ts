import * as path from 'path';
import { execSync } from 'child_process';
import * as jsonFile from 'jsonfile';
import fetch from 'node-fetch';
import Clockify from '../Clockify';

const workspacesResponse = JSON.stringify([
  {
    id: 'workspace-test',
    name: 'Testing',
    hourlyRate: {
      amount: 0,
      currency: 'USD',
    },
    memberships: [
      {
        userId: 'id-test',
        hourlyRate: null,
        membershipType: 'WORKSPACE',
        membershipStatus: 'ACTIVE',
        target: 'target-test',
      },
    ],
    workspaceSettings: {
      timeRoundingInReports: false,
      onlyAdminsSeeBillableRates: true,
      onlyAdminsCreateProject: true,
      onlyAdminsSeeDashboard: false,
      defaultBillableProjects: true,
      lockTimeEntries: null,
      round: {
        round: 'Round to nearest',
        minutes: '15',
      },
      projectFavorites: true,
      canSeeTimeSheet: false,
      projectPickerSpecialFilter: false,
      forceProjects: false,
      forceTasks: false,
      forceTags: false,
      forceDescription: false,
      onlyAdminsSeeAllTimeEntries: false,
      onlyAdminsSeePublicProjectsEntries: false,
      trackTimeDownToSecond: true,
      projectGroupingLabel: 'client',
    },
    imageUrl: '',
  },
]);

const clientsResponse = JSON.stringify([
  {
    id: 'client-test-1',
    name: 'Updated Client',
    workspaceId: 'workspace-test',
  },
  {
    id: 'client-test-2',
    name: 'Test Client_1',
    workspaceId: 'workspace-test',
  },
]);

const projectsResponse = JSON.stringify([
  {
    id: 'project-test',
    name: 'Project One',
    hourlyRate: null,
    clientId: '',
    client: null,
    workspaceId: 'workspace-test',
    billable: true,
    memberships: [
      {
        userId: 'user-test',
        hourlyRate: null,
        membershipType: 'PROJECT',
        membershipStatus: 'ACTIVE',
        target: 'target-test',
      },
    ],
    color: '#f44336',
    estimate: {
      estimate: 'PT0S',
      type: 'AUTO',
    },
    archived: false,
    tasks: [],
    public: false,
  },
]);

const timeEntriesResponse = JSON.stringify([
  {
    id: 'entry-test-1',
    description: 'This is a test entry.',
    tags: null,
    billable: false,
    task: null,
    workspaceId: 'workspace-test',
    totalBillable: null,
    hourlyRate: null,
    isLocked: false,
    projectId: 'project-test',
    start: '2018-09-11T14:30:45Z',
    end: '2018-09-11T15:30:45Z',
    duration: 'PT1H',
  },
  {
    id: 'entry-test-2',
    description: 'This is another test entry.',
    tags: [
      {
        id: 'tag-test',
        name: 'javascript',
        workspaceId: 'workspace-test',
      },
    ],
    billable: false,
    task: null,
    workspaceId: 'workspace-test',
    totalBillable: null,
    hourlyRate: null,
    isLocked: false,
    projectId: 'project-test',
    start: '2018-09-09T20:00:00Z',
    end: '2018-09-10T04:00:00Z',
    duration: 'PT8H',
  },
]);

describe('The Clockify class', () => {
  describe('the writeDataToJson() method', () => {
    test('fetches all data and writes to file that matches snapshot', async () => {
      expect.assertions(1);
      (fetch as any)
        .mockResponseOnce(workspacesResponse)
        .mockResponseOnce(clientsResponse)
        .mockResponseOnce(projectsResponse)
        .mockResponseOnce(timeEntriesResponse);

      const outputPath = `${__dirname}/test.json`;
      const clockify = new Clockify(testHelpers.configFixturePath);
      await clockify.writeDataToJson(outputPath);

      const result = jsonFile.readFileSync(outputPath);
      execSync(`rm -f ${outputPath}`);
      expect(result).toMatchSnapshot();
    });
  });
});
