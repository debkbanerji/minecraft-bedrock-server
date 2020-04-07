// Downloads the server code from Microsoft
const fs = require('fs');
const assert = require('assert');
const unzipper = require('unzipper')
const util = require('util');

const createBackup = util.promisify((backupStartTime, callback) => {
  // TODO: Actually create backup
  console.log(`Created Backup based of server state at ${(new Date(backupStartTime * 1000)).toLocaleString()} (Unixtime: ${backupStartTime})`);
  callback();
});

module.exports = {
  createBackup
};
