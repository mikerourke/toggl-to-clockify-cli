import * as fs from 'fs';
import * as path from 'path';
import * as jsonFile from 'jsonfile';

/**
 * Wrapper class for jsonfile library.
 * @class
 */
export default class JsonFile {
  private readonly filePath: string;

  constructor(private fileName: string) {
    this.filePath = path.resolve(process.cwd(), 'data', fileName);
  }

  private validateFile() {
    if (!fs.existsSync(this.filePath)) {
      return new Error(`Could not find JSON file at ${this.filePath}`);
    }
    return null;
  }

  public write(contents: any) {
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

  public read() {
    const validation = this.validateFile();
    if (validation !== null) {
      return Promise.reject(validation);
    }

    return new Promise((resolve, reject) => {
      jsonFile.readFile(this.filePath, (error: Error | null, contents: any) => {
        if (error) return reject(error);
        return resolve(contents);
      });
    });
  }
}
