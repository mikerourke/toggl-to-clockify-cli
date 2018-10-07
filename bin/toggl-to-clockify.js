#!/usr/bin/env node
const yargs = require('yargs');

const argv = yargs
  .usage('Usage: toggl-to-clockify <command> [options]')
  .commandDir('../lib/cmds')
  .help()
  .alias('help', 'h')
  .version(false)
  .wrap(Math.min(100, yargs.terminalWidth()))
  .argv;
