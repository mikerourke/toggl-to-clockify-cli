import * as path from 'path';
import { execSync } from 'child_process';
import * as jsonFile from 'jsonfile';
import mock from 'mock-fs';
import { validateConfigFile } from '../commandUtils';

describe('The commandUtils file', () => {
  const { configFixturePath } = testHelpers;

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

      execSync(`rm -f ${testFilePath}`);

      const validContents = jsonFile.readFileSync(configFixturePath);
      jsonFile.writeFileSync(testFilePath, validContents);
      const result = validateConfigFile(testFilePath);
      execSync(`rm -f ${testFilePath}`);

      expect(path.dirname(result)).toEqual(__dirname);
      expect(path.basename(result)).toEqual(testFileName);
    });

    describe('for a file containing invalid contents', () => {
      let configContents;

      beforeEach(() => {
        configContents = jsonFile.readFileSync(configFixturePath);
      });

      afterEach(() => {
        mock.restore();
      });

      test(`returns an empty string if the workspaces array is empty`, () => {
        const updatedContents = {
          ...configContents,
          workspaces: [],
        };

        mock({
          [configFixturePath]: mock.file({
            content: JSON.stringify(updatedContents),
          }),
        });

        const result = validateConfigFile(configFixturePath);
        expect(logMessage).toMatch('Your Workspace Name');
        expect(result).toEqual('');
      });

      test(`returns an empty string if one of the workspaces has an invalid name`, () => {
        const updatedContents = {
          ...configContents,
          workspaces: [{ name: '', years: [2018] }],
        };

        mock({
          [configFixturePath]: mock.file({
            content: JSON.stringify(updatedContents),
          }),
        });

        const result = validateConfigFile(configFixturePath);
        expect(logMessage).toMatch('invalid value for "name"');
        expect(result).toEqual('');
      });

      test(`returns an empty string if one of the workspaces has an empty array for years`, () => {
        const updatedContents = {
          ...configContents,
          workspaces: [{ name: 'Valid Name', years: [] }],
        };

        mock({
          [configFixturePath]: mock.file({
            content: JSON.stringify(updatedContents),
          }),
        });

        const result = validateConfigFile(configFixturePath);
        expect(logMessage).toMatch('missing a value for "years"');
        expect(result).toEqual('');
      });

      test(`returns an empty string if one of the workspaces has a year in an invalid format`, () => {
        const updatedContents = {
          ...configContents,
          workspaces: [{ name: 'Valid Name', years: [18] }],
        };

        mock({
          [configFixturePath]: mock.file({
            content: JSON.stringify(updatedContents),
          }),
        });

        const result = validateConfigFile(configFixturePath);
        expect(logMessage).toMatch('must be a four-digit number');
        expect(result).toEqual('');
      });
    });
  });
});
