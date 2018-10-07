import chalk from 'chalk';
import Config from '../utils/Config';
import Clockify from '../tools/Clockify';
import Toggl from '../tools/Toggl';
import JsonFile from '../utils/JsonFile';
import { ToolName } from '../types/common';

export const command = 'write';
export const alias = 'w';
export const desc = 'Fetches data from API and writes a to JSON file';

export const builder = yargs => {
  yargs
    .options({
      source: {
        alias: 's',
        describe: 'Source of data',
        choices: Object.values(ToolName),
        demandOption: true,
      },
      output: {
        alias: 'o',
        describe:
          'Output path for the JSON file. If not specified, defaults to working directory',
      },
      config: {
        alias: 'c',
        describe:
          'Path to configuration file. Defaults to searching for "t2c.json" in working directory',
      },
    })
    .help()
    .alias('help', 'h');
};

interface Parameters {
  source: ToolName;
  config?: string;
  output?: string;
}

export const handler = (parameters: Parameters) => {
  const { source, output, config } = parameters;
  const configFilePath = Config.validateFilePath(config);
  if (configFilePath === null) {
    console.log(chalk.red('You must specify a valid config file path'));
    process.exit();
    return;
  }

  const outputPath = JsonFile.validatePath(source, output);
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
  }[source];

  entity.writeDataToJson(outputPath);
};
