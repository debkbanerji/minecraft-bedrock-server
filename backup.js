// Downloads the server code from Microsoft
const fs = require('fs');
const assert = require('assert');
const unzipper = require('unzipper')
const util = require('util');

const createBackup = util.promisify((backupFileListString, backupStartTime, callback) => {
  // TODO: Actually create backup
  const instructionStrings = backupFileListString.split(', ');
  const fileToCopyLength = {};
  instructionStrings.forEach((instruction) => {
    const splitInstruction = instruction.split(':');
    fileToCopyLength[splitInstruction[0]] = parseInt(splitInstruction[1]);
  });
  console.log(fileToCopyLength)

  console.log(`Created Backup based of server state at ${(new Date(backupStartTime * 1000)).toLocaleString()} (Unixtime: ${backupStartTime})`);
  callback();
});

module.exports = {
  createBackup
};
