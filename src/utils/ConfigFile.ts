import * as fs from 'fs';
import * as path from 'path';
import JsonFile from './JsonFile';
import { Config } from '../types/common';

export const defaultSettings = {
  email: '',
  togglApiToken: '',
  clockifyApiToken: '',
  workspaces: [],
};

export default class ConfigFile {
  public static validateFilePath(filePath?: string | null): string | null {
    const configFilePath = path.resolve(process.cwd(), 't2c.json');
    if (filePath && fs.existsSync(filePath)) return filePath;
    if (fs.existsSync(configFilePath)) return configFilePath;
    return null;
  }

  public static loadEntriesFromFile(filePath: string): Config {
    const jsonFile = new JsonFile(filePath);
    const configFileContents = jsonFile.readSync();
    if (configFileContents === null) return defaultSettings;
    return configFileContents;
  }

  public static async generateFile(targetPath: string) {
    const configFile = new JsonFile(targetPath);
    const generatedContents = {
      ...defaultSettings,
      workspaces: [
        {
          name: '',
          years: [],
        },
      ],
    };
    await configFile.write(generatedContents);
  }
}
