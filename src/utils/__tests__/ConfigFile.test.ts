import * as fs from 'fs';
import * as path from 'path';
import * as jsonFile from 'jsonfile';
import mock from 'mock-fs';
import ConfigFile from '../ConfigFile';

describe('The ConfigFile class', () => {
  describe('the validateFilePath() method', () => {
    beforeAll(() => {
      mock({
        't2c.json': mock.file({
          content: '{}',
        }),
      });
    });

    afterAll(() => {
      mock.restore();
    });

    test(`returns the default file path if it exists`, () => {
      const result = ConfigFile.validateFilePath() as string;
      expect(path.dirname(result)).toEqual(process.cwd());
      expect(path.basename(result)).toEqual('t2c.json');
    });
  });

  describe('the loadEntriesFromFile() method', () => {
    test(`matches its snapshot when the config file is valid`, () => {
      const testConfigPath = path.resolve(
        __dirname,
        '..',
        '__fixtures__',
        't2c.json',
      );
      const result = ConfigFile.loadEntriesFromFile(testConfigPath);
      expect(result).toMatchSnapshot();
    });

    test(`matches its snapshot when the config file doesn't exist`, () => {
      const result = ConfigFile.loadEntriesFromFile('');
      expect(result).toMatchSnapshot();
    });
  });

  describe('the generateFile() method', () => {
    const testFilePath = `${__dirname}/generateFile.json`;

    test(`file contents matches its snapshot`, async () => {
      expect.assertions(1);
      await ConfigFile.generateFile(testFilePath);
      const contents = jsonFile.readFileSync(testFilePath);
      fs.unlinkSync(testFilePath);
      expect(contents).toMatchSnapshot();
    });
  });
});
