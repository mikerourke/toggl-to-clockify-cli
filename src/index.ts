import Clockify from './tools/Clockify';
import Toggl from './tools/Toggl';

/**
 * Fetches data from Toggl and writes to the `/data/toggl.json` file.
 */
const writeTogglData = async () => {
  const toggl = new Toggl();
  await toggl.writeDataToJson();
};

/**
 * Fetches data from Clockify and writes to the `/data/clockify.json` file.
 */
const writeClockifyData = async () => {
  const clockify = new Clockify();
  await clockify.writeDataToJson();
};

/**
 * Transfers Toggl data to Clockify.
 */
const transferTogglToClockify = async () => {
  const clockify = new Clockify();
  await clockify.transferAllDataFromToggl();
};

/**
 * Gets data from Toggl and transfers to Clockify.
 */
const getTogglDataAndTransfer = async () => {
  await writeTogglData();
  await transferTogglToClockify();
};

// getTogglDataAndTransfer();
