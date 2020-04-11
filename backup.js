// Downloads the server code from Microsoft
const fs = require('fs-extra');
const assert = require('assert');
const unzipper = require('unzipper')
const util = require('util');

const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);


const {
  CONFIG_FILE_PATH,
  SERVER_WORLDS_FOLDER_NAME,
  SERVER_WORLDS_FOLDER_PATH,
  BACKUP_FOLDER_NAME,
  BACKUP_FOLDER_PATH,
  MS_IN_SEC,
  platform
} = require('./utils.js');

async function _createBackupFromFileToCopyLength(fileToCopyLength, backupStartTime, backupType) {
  assert(backupType, `Undefined backup type`);
  const backupDirPath = `${BACKUP_FOLDER_PATH}/${backupStartTime}_${backupType}`;
  fs.ensureDirSync(backupDirPath);
  const copyPromises = Object.keys(fileToCopyLength).map(async (fileName) => {
    const contentLength = fileToCopyLength[fileName];

    // Sadly, the 'save query command' doesn't give us the correct path for all
    // files - attempting to fix that now
    if (!(await fs.pathExists(`${SERVER_WORLDS_FOLDER_PATH}/${fileName}`))) {
      fileName = fileName.replace('/', '/db/');
    }

    const source = `${SERVER_WORLDS_FOLDER_PATH}/${fileName}`;
    const destination = `${backupDirPath}/${fileName}`;
    await fs.ensureFile(destination);
    await pipeline(
      fs.createReadStream(source, {
        end: contentLength - 1
      }),
      fs.createWriteStream(destination),
    );
  });
  await Promise.all(copyPromises);
  console.log(`Finished creating backup of server state at ${new Date(backupStartTime*MS_IN_SEC).toLocaleString()} with type ${backupType}\n`);
  return;
};

async function createBackup(backupFileListString, backupStartTime, backupType) {
  const instructionStrings = backupFileListString.split(', ');
  const fileToCopyLength = {};
  instructionStrings.forEach((instruction) => {
    const splitInstruction = instruction.split(':');
    fileToCopyLength[splitInstruction[0]] = parseInt(splitInstruction[1]);
  });

  await _createBackupFromFileToCopyLength(fileToCopyLength, backupStartTime, backupType);
};

module.exports = {
  createBackup
};
