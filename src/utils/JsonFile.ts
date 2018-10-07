import * as fs from 'fs';
import * as path from 'path';
import { endsWith, isNil } from 'lodash';
import * as jsonFile from 'jsonfile';

/**
 * Wrapper class for jsonfile library.
 * @class
 */
export default class JsonFile {
  public static validatePath(
    defaultFileName: string,
    filePath?: string,
  ): string | null {
    const pathToValidate = isNil(filePath)
      ? path.resolve(process.cwd(), `${defaultFileName}.json`)
      : filePath;

    const baseOfPath = path.basename(pathToValidate);
    if (endsWith(baseOfPath, '.json')) return pathToValidate;
    return null;
  }

  constructor(private filePath: string) {}

  public write(contents: any): Promise<void> {
    return new Promise((resolve, reject) => {
      jsonFile.writeFile(
        this.filePath,
        contents,
        { spaces: 2 },
        (error: Error | null) => {
          if (error) return reject(error);
          return resolve();
        },
      );
    });
  }

  public async read(): Promise<any> {
    if (!fs.existsSync(this.filePath)) {
      return Promise.reject(
        new Error(`Could not find JSON file at ${this.filePath}`),
      );
    }

    return new Promise((resolve, reject) => {
      jsonFile.readFile(this.filePath, (error: Error | null, contents: any) => {
        if (error) return reject(error);
        return resolve(contents);
      });
    });
  }

  public readSync() {
    if (!fs.existsSync(this.filePath)) return null;
    return jsonFile.readFileSync(this.filePath);
  }
}
