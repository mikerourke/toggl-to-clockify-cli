import chalk from 'chalk';
import Clockify from '../tools/Clockify';
import Toggl from '../tools/Toggl';
import {
  commonOptions,
  validateConfigFile,
  validateNodeVersion,
} from '../utils/commandUtils';
import JsonFile from '../utils/JsonFile';
import { ToolName } from '../types/common';

export const command = 'write';
export const alias = 'w';
export const desc = 'Fetches data from API and writes a to JSON file';

export const builder = yargs => {
  yargs
    .options({
      tool: {
        alias: 't',
        describe: 'Tool to get data for',
        choices: Object.values(ToolName),
        demandOption: true,
      },
      output: {
        alias: 'o',
        describe:
          'Output path for the JSON file. If not specified, defaults to working directory',
      },
      ...commonOptions,
    })
    .help()
    .alias('help', 'h');
};

interface Parameters {
  tool: ToolName;
  config?: string;
  output?: string;
}

export const handler = (parameters: Parameters) => {
  const { tool, output, config } = parameters;

  if (!validateNodeVersion()) {
    process.exit();
    return;
  }

  const configFilePath = validateConfigFile(config);
  if (configFilePath === '') process.exit();

  const outputPath = JsonFile.validatePath(tool, output);
  if (outputPath === null) {
    console.log(
      chalk.red('You must specify a JSON file name for the output path'),
    );
    process.exit();
    return;
  }

  const entity = {
    [ToolName.Clockify]: new Clockify(configFilePath),
    [ToolName.Toggl]: new Toggl(configFilePath),
  }[tool];

  entity.writeDataToJson(outputPath);
};
