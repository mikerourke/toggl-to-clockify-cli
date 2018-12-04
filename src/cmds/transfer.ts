import * as path from 'path';
import chalk from 'chalk';
import {
  commonOptions,
  validateConfigFile,
  validateNodeVersion,
} from '../utils/commandUtils';
import Toggl from '../tools/Toggl';
import Clockify from '../tools/Clockify';

export const command = 'transfer';
export const alias = 't';
export const desc = 'Transfers projects from Toggl to Clockify';

export const builder = yargs => {
  yargs
    .options({
      ...commonOptions,
    })
    .help()
    .alias('help', 'h');
};

interface Parameters {
  config?: string;
}

export const handler = (parameters: Parameters) => {
  const { config } = parameters;
  if (!validateNodeVersion()) {
    process.exit();
    return;
  }

  const configFilePath = validateConfigFile(config);
  if (configFilePath === '') process.exit();
  const togglOutputPath = path.resolve(process.cwd(), 'toggl.json');

  const toggl = new Toggl(configFilePath);
  const clockify = new Clockify(configFilePath);

  toggl
    .writeDataToJson(togglOutputPath)
    .then(() => clockify.transferAllDataFromToggl(togglOutputPath))
    .then(() => {
      console.log(chalk.green.bold('Transfer successfully complete'));
    });
};
