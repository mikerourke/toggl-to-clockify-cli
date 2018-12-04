import chalk from 'chalk';
import { get } from 'lodash';
import ConfigFile from './ConfigFile';

export const commonOptions = {
  config: {
    alias: 'c',
    describe:
      'Path to configuration file. Defaults to searching for "t2c.json" in working directory',
  },
};

const printError = (message: string, isBright: boolean = false) => {
  const chalkFn = isBright ? chalk.redBright : chalk.red;
  console.log(chalkFn(message));
};

const printMissingWorkspacesError = () => {
  printError('You must specify workspaces in your config file');
  printError('They should be in the following format:');

  const workspaceExample = [
    '{',
    '  name: "Your Workspace Name"',
    '  years: [2018, 2017]',
    '}',
  ]
    .map(value => `  ${value}`)
    .join('\n');
  printError(workspaceExample, true);
};

export const validateConfigFile = (configPath?: string): string => {
  const configFilePath = ConfigFile.validateFilePath(configPath);
  if (configFilePath === null) {
    printError('You must specify a valid config file path');
    return '';
  }

  const contents = ConfigFile.loadEntriesFromFile(configFilePath);
  if (contents.workspaces.length === 0) {
    printMissingWorkspacesError();
    return '';
  }

  let workspacesErrorFound = false;
  for (const workspace of contents.workspaces) {
    if (get(workspace, 'name', '') === '') {
      printError(
        'One of your workspaces has a missing or invalid value for "name"',
      );
      workspacesErrorFound = true;
      break;
    }

    if (get(workspace, 'years', []).length === 0) {
      printError('One of your workspaces is missing a value for "years"');
      workspacesErrorFound = true;
      break;
    }

    const invalidYearFormatCount = workspace.years.reduce(
      (acc, year) => (year.toString().length !== 4 ? acc + 1 : acc),
      0,
    );
    if (invalidYearFormatCount > 0) {
      printError('One of your workspaces has an invalid value for "years"');
      printError('The year must be a four-digit number (e.g. 2018)');
      workspacesErrorFound = true;
      break;
    }
  }
  if (workspacesErrorFound) return '';

  return configFilePath;
};

export const validateNodeVersion = () => {
  const currentVersion = process.version;
  let isValid = true;
  if (currentVersion) {
    const parseableVersion = currentVersion.replace('v', '');
    const [major, minor] = parseableVersion.split('.');
    isValid = +major >= 10 && +minor >= 3;
  }

  if (!isValid) {
    printError('You must be using Node.js v10.3 or greater');
    printError(`Your current version, ${currentVersion}, won't work`);
  }

  return isValid;
};
