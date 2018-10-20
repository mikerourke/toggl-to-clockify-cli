import * as path from 'path';
import * as fs from 'fs';
import { validateConfigFile } from '../commandUtils';

describe('The commandUtils file', () => {
  describe(`the validateConfigFile() method`, () => {
    let consoleLog;
    let logMessage;

    beforeAll(() => {
      consoleLog = console.log;
      console.log = message => {
        logMessage = message;
      };
    });

    afterAll(() => {
      console.log = consoleLog;
    });

    afterEach(() => {
      logMessage = '';
    });

    test(`returns an empty string if no file name is specified and the default file doesn't exist`, () => {
      const result = validateConfigFile();
      expect(logMessage).toMatch('You must specify a valid config file path');
      expect(result).toEqual('');
    });

    test(`returns an empty string if a file name that doesn't exist is specified`, () => {
      const result = validateConfigFile('__NO_FILE__.json');
      expect(logMessage).toMatch('You must specify a valid config file path');
      expect(result).toEqual('');
    });

    test('returns the file path for a file that does exist', () => {
      const testFileName = '__TEST__.json';
      const testFilePath = `${__dirname}/${testFileName}`;

      fs.writeFileSync(testFilePath, '');
      const result = validateConfigFile(testFilePath);
      fs.unlinkSync(testFilePath);

      expect(path.dirname(result)).toEqual(__dirname);
      expect(path.basename(result)).toEqual(testFileName);
    });
  });
});
