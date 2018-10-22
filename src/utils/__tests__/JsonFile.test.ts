import * as path from 'path';
import { execSync } from 'child_process';
import JsonFile from '../JsonFile';

describe('The JsonFile class', () => {
  describe('the validatePath() method', () => {
    test('returns a valid file path if a defaultFileName is specified and a filePath is not specified', () => {
      const result = JsonFile.validatePath('test');
      const expected = path.resolve(process.cwd(), 'test.json');
      expect(result).toEqual(expected);
    });

    test('returns a valid file path if a defaultFileName and filePath is specified', () => {
      const testPath = `${__dirname}/test-subfolder/test.json`;
      const result = JsonFile.validatePath('test', testPath);
      expect(result).toEqual(testPath);
    });

    test('returns null if filePath does not end with ".json"', () => {
      const testPath = `${__dirname}/test-subfolder/test`;
      const result = JsonFile.validatePath('test', testPath);
      expect(result).toBeNull();
    });
  });

  describe('the write() method', () => {
    test('throws an error that matches snapshot if the file path is invalid', async () => {
      expect.assertions(1);
      const jsonFile = new JsonFile(__dirname);
      try {
        await jsonFile.write('a');
      } catch (error) {
        expect(error.code).toEqual('EISDIR');
      }
    });
  });

  describe('the read() method', () => {
    test('returns the contents of a JSON file when the path is valid', async () => {
      expect.assertions(1);
      const configPath = path.resolve(
        __dirname,
        '..',
        '__fixtures__',
        't2c.json',
      );
      const jsonFile = new JsonFile(configPath);
      const result = await jsonFile.read();
      expect(result).toMatchSnapshot();
    });

    test('throws an error if the specified file path does not exist', async () => {
      expect.assertions(1);
      const invalidPath = `${__dirname}/missing.json`;
      const jsonFile = new JsonFile(invalidPath);
      try {
        await jsonFile.read();
      } catch (error) {
        expect(error.message).toMatch('Could not find JSON file');
      }
    });

    test('throws an error if the file contents are invalid', async () => {
      expect.assertions(1);
      const invalidPath = `${__dirname}/invalid.json`;
      execSync(`echo '' >> ${invalidPath}`);
      const jsonFile = new JsonFile(invalidPath);
      try {
        const results = await jsonFile.read();
        console.log(results);
      } catch (error) {
        expect(error.message).toMatch('Unexpected end');
      } finally {
        execSync(`rm -f ${invalidPath}`);
      }
    });
  });
});
