import chalk from 'chalk';
import ConfigFile from './ConfigFile';

export const commonOptions = {
  config: {
    alias: 'c',
    describe:
      'Path to configuration file. Defaults to searching for "t2c.json" in working directory',
  },
};

export const validateConfigFile = (configPath?: string): string => {
  const configFilePath = ConfigFile.validateFilePath(configPath);
  if (configFilePath === null) {
    console.log(chalk.red('You must specify a valid config file path'));
    return '';
  }
  return configFilePath;
};
