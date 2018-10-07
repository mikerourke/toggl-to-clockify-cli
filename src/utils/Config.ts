import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import JsonFile from './JsonFile';

export interface Settings {
  email: string;
  togglApiToken: string;
  clockifyApiToken: string;
  workspaces: { name: string; years: number[] }[];
}

export const defaultSettings = {
  email: '',
  togglApiToken: '',
  clockifyApiToken: '',
  workspaces: [],
};

export default class Config {
  public static validateFilePath(filePath?: string | null): string | null {
    const configFilePath = path.resolve(process.cwd(), 't2c.json');
    if (filePath && fs.existsSync(filePath)) return filePath;
    if (fs.existsSync(configFilePath)) return configFilePath;
    return null;
  }

  public static loadSettingsFromFile(filePath: string): Settings {
    const jsonFile = new JsonFile(filePath);
    const configFileContents = jsonFile.readSync();
    if (configFileContents === null) return defaultSettings;
    return configFileContents;
  }

  public static async generateFile(targetPath: string) {
    const configFile = new JsonFile(targetPath);
    await configFile.write(defaultSettings);
    console.log(chalk.green(`Config file created at ${targetPath}`));
  }
}
