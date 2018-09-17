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
    return new Promise((resolve, reject) => {
      jsonFile.readFile(this.filePath, (error: Error | null, contents: any) => {
        if (error) return reject(error);
        return resolve(contents);
      });
    });
  }
}
