const path = require('path');
const fetch = require('jest-fetch-mock');

jest.setMock('node-fetch', fetch);

const testHelpers = {};
testHelpers.configFixturePath = path.resolve(
  process.cwd(),
  'src',
  'utils',
  '__fixtures__',
  't2c.json',
);

global.testHelpers = testHelpers;
