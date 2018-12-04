import chalk from 'chalk';
import ConfigFile from '../utils/ConfigFile';
import JsonFile from '../utils/JsonFile';
import { validateNodeVersion } from '../utils/commandUtils';

export const command = 'init';
export const alias = 'i';
export const desc =
  'Creates configuration file for specifying API keys and workspaces';

export const builder = yargs => {
  yargs
    .options({
      output: {
        alias: 'o',
        describe:
          'Output path for the configuration file. If not specified, defaults to working directory',
      },
    })
    .help()
    .alias('help', 'h');
};

interface Parameters {
  output?: string;
}

export const handler = (parameters: Parameters) => {
  const { output } = parameters;

  if (!validateNodeVersion()) {
    process.exit();
    return;
  }

  const outputPath = JsonFile.validatePath('t2c', output);
  if (outputPath === null) {
    console.log(
      chalk.red('You must specify a JSON file name for the output path'),
    );
    process.exit();
    return;
  }

  ConfigFile.generateFile(outputPath)
    .then(() => {
      console.log(chalk.green('Configuration file successfully created'));
    })
    .catch(error => {
      console.log(chalk.red(`Error creating file: ${error.message}`));
    });
};
