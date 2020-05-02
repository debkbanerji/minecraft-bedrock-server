// Downloads the server code from Microsoft
const fs = require('fs-extra');
const assert = require('assert');
const archiver = require('archiver');
const unzipper = require('unzipper');
const AWS = require('aws-sdk');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);


const {
  CONFIG_FILE_PATH,
  SERVER_WORLDS_FOLDER_NAME,
  SERVER_WORLDS_FOLDER_PATH,
  BACKUP_FOLDER_NAME,
  BACKUP_FOLDER_PATH,
  BACKUP_TYPES,
  MS_IN_SEC,
  platform
} = require('./utils.js');


const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
const config = JSON.parse(configFile);
const backupConfig = config.backup;
assert(backupConfig, `Could not find field 'backup' at root of config`);
// too lazy for more error handling :/
const localBackupKeepCount = backupConfig["num-backups-to-keep-for-type"].local;
const remoteBackupKeepCount = backupConfig["num-backups-to-keep-for-type"].remote;

// AWS STUFF
let s3 = null;
const serverProps = config['server-properties'];
const bucketName = `Minecraft-bedrock-backup.${serverProps['level-name']}`.toLowerCase().replace(/( |_)/g, "-").replace(/(-+)/g, "-");


if (backupConfig["use-aws-s3-backup"]) {
  s3 = new AWS.S3({
    apiVersion: '2006-03-01'
  });
} else {
  console.log(`!!!!!!!!!!\nconfig["backup"]["use-aws-s3-backup"] set to false - if you want to use AWS S3 backups, set this to true and see https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html for instruction on how to define your AWS credentials\n!!!!!!!!!!\n`);
}

async function createBackupBucketIfNotExists() {
  if (s3) {
    await s3.createBucket({
      Bucket: bucketName
    }).promise();
  }
}

async function _createBackupFromFileToCopyLength(fileToCopyLength, backupStartTime, backupType) {
  assert(backupType, `Undefined backup type`);
  fs.ensureDirSync(BACKUP_FOLDER_PATH);
  const archive = archiver('zip');
  const outputArchiveFileName = `${backupStartTime}_${backupType}.zip`;
  const outputArchiveStream = fs.createWriteStream(`${BACKUP_FOLDER_PATH}/${outputArchiveFileName}`);
  archive.pipe(outputArchiveStream);
  await Promise.all(Object.keys(fileToCopyLength).map(async (fileName) => {
    const contentLength = fileToCopyLength[fileName];

    // Sadly, the 'save query command' doesn't give us the correct path for all
    // files - attempting to fix that now
    if (!(await fs.pathExists(`${SERVER_WORLDS_FOLDER_PATH}/${fileName}`))) {
      fileName = fileName.replace('/', '/db/');
    }
    if (!(await fs.pathExists(`${SERVER_WORLDS_FOLDER_PATH}/${fileName}`))) {
      fileName = fileName.replace('/db/', '/db/lost/');
    }

    const source = `${SERVER_WORLDS_FOLDER_PATH}/${fileName}`;
    const readStream = fs.createReadStream(source, {
      end: contentLength > 0 ? contentLength - 1 : 0
    });
    archive.append(readStream, {
      name: fileName
    });
  }));
  archive.finalize();
  await new Promise(fulfill => outputArchiveStream.on("close", fulfill));


  if (s3) {
    await pushBackupToRemote(outputArchiveFileName);
    await purgeOldRemoteBackups();
  }

  // purge old backups now since we may have too many
  try {
    await purgeOldLocalBackups();
  } catch (e) {
    console.error(e);
  }
  console.log(`Finished creating local backup of server state at ${new Date(backupStartTime*MS_IN_SEC).toLocaleString()} with type ${backupType}\n`);
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


function getFilePathsSync(dir, files_) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (var i in files) {
    const name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFilePathsSync(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}

async function createUnscheduledBackup(backupStartTime) {
  // blindly tries to create a backup of everything in the current worlds folder
  // without the file and position list provided by 'save query'
  console.log('!!!!!!!!!!!\n\nRUNNING BACKUP DUE TO A FORCED STOP - creating a sketchy ad hoc backup of server state...');
  const filePaths = getFilePathsSync(SERVER_WORLDS_FOLDER_PATH).map(filePath => filePath.replace(`${SERVER_WORLDS_FOLDER_PATH}/`, ''));
  const fileToCopyLength = {};
  filePaths.forEach(path => {
    fileToCopyLength[path] = Infinity;
  });
  await _createBackupFromFileToCopyLength(fileToCopyLength, backupStartTime, BACKUP_TYPES.ON_FORCED_STOP);
  console.log(`\nPlease check the state of the server and make sure the latest backup is a valid one before continued use (use force-restore <BACKUP_FILE_NAME> if necessary)`);
  console.log(`\nIn the future, please use the 'stop' command to kill the server`);
}

async function restoreLatestLocalBackup() {
  console.log('\nRestoring latest local backup...');
  fs.ensureDirSync(BACKUP_FOLDER_PATH);
  const backupFiles = await fs.readdir(BACKUP_FOLDER_PATH);
  const allArchives = await fs.readdir(BACKUP_FOLDER_PATH);
  allArchives.sort((name1, name2) => {
    const ts1Match = name1.match(/\d*/);
    const ts2Match = name2.match(/\d*/);
    const ts1 = parseInt(ts1Match[0]);
    const ts2 = parseInt(ts2Match[0]);
    return ts2 - ts1;
  });
  const restorableArchives = allArchives.filter(
    fileName => !fileName.includes(BACKUP_TYPES.ON_FORCED_STOP)
  );
  const numForceStopArchives = allArchives.length - restorableArchives.length;
  if (numForceStopArchives > 0) {
    console.log(`WARNING: Skipped ${numForceStopArchives} archive(s) of type 'ON_FORCED_STOP' that were generated when the server exited ungracefully`);
  }
  if (restorableArchives.length > 0) {
    await restoreLocalBackup(restorableArchives[0]);
  } else {
    console.log(`No backups found - leaving 'worlds' folder as is`);
  }
}

async function restoreLocalBackup(backupArchiveName) {

  if (!/\.zip$/gi.test(backupArchiveName)) {
    backupArchiveName = backupArchiveName + '.zip';
  }

  const backupArchivePath = `${BACKUP_FOLDER_PATH}/${backupArchiveName}`;
  if (!(await fs.pathExists(backupArchivePath))) {
    console.error(`Could not find backup archive: ${backupArchivePath}`);
    return false;
  } else {
    fs.removeSync(SERVER_WORLDS_FOLDER_PATH);
    fs.ensureDirSync(SERVER_WORLDS_FOLDER_PATH);
    await pipeline(
      fs.createReadStream(backupArchivePath),
      unzipper.Extract({
        path: SERVER_WORLDS_FOLDER_PATH
      })
    );
    console.log(`Successfully restored backup ${backupArchivePath}`)
    return true;
  }
}

function getBackupsToPurge(backupFileNameList, maxToKeep) {
  backupFileNameList.sort((name1, name2) => {
    const ts1Match = name1.match(/\d*/);
    const ts2Match = name2.match(/\d*/);
    const ts1 = parseInt(ts1Match[0]);
    const ts2 = parseInt(ts2Match[0]);
    return ts2 - ts1;
  });
  if (maxToKeep != null && maxToKeep > -1) {
    return backupFileNameList.slice(maxToKeep);
  } else {
    return [];
  }
};

async function purgeOldLocalBackups() {
  fs.ensureDirSync(BACKUP_FOLDER_PATH);
  const allArchives = await fs.readdir(BACKUP_FOLDER_PATH);
  await Promise.all(Object.keys(BACKUP_TYPES).map(async (backupType) => {
    const maxBackupTypes = localBackupKeepCount[backupType];
    const backupsToPurge = getBackupsToPurge(allArchives.filter(
      fileName => fileName.includes(backupType)
    ), maxBackupTypes);
    backupsToPurge.forEach(async (backupToPurge) => {
      await fs.remove(`${BACKUP_FOLDER_PATH}/${backupToPurge}`);
      console.log(`Removed ${backupToPurge} from local backups folder due to parameters defined in config["backup"]["num-backups-to-keep-for-type"]["local"]`);
    });
  }));
}

async function purgeOldRemoteBackups() {
  const bucketContents = await s3.listObjects({
    Bucket: bucketName
  }).promise();
  const allArchives = bucketContents.Contents.map(entry => entry.Key);
  await Promise.all(Object.keys(BACKUP_TYPES).map(async (backupType) => {
    const maxBackupTypes = remoteBackupKeepCount[backupType];
    const backupsToPurge = getBackupsToPurge(allArchives.filter(
      fileName => fileName.includes(backupType)
    ), maxBackupTypes);
    backupsToPurge.forEach(async (backupToPurge) => {
      await s3.deleteObject({
        Bucket: bucketName,
        Key: backupToPurge
      }).promise();
      console.log(`Removed ${backupToPurge} from AWS S3 due to parameters defined in config["backup"]["num-backups-to-keep-for-type"]["remote"]`);
    });
  }));
}

const pushBackupToRemote = util.promisify((archiveName, callback) => {
  const readStream = fs.createReadStream(`${BACKUP_FOLDER_PATH}/${archiveName}`);
  var params = {
    Bucket: bucketName,
    Key: archiveName,
    Body: readStream
  };
  s3.upload(params, function(err, data) {
    if (!err) {
      console.log(`Successfully backed up ${archiveName} to AWS S3`);
      callback();
    } else {
      console.log(`Error uploading ${archiveName} to AWS S3:`);
      console.error(err);
    }
  });
});

function getRemoteBackupsToDownload(allRemoteBackups, allLocalBackups) {
  const lists = Object.keys(BACKUP_TYPES).map((backupType) => {
    const maxBackupTypes = remoteBackupKeepCount[backupType];
    const localBackups = allLocalBackups.filter(
      fileName => fileName.includes(backupType)
    );
    const remoteBackups = allRemoteBackups.filter(
      fileName => fileName.includes(backupType)
    );
    let allBackupsOfType = localBackups.concat(remoteBackups);
    allBackupsOfType = [...new Set(allBackupsOfType)]; // remove duplicates
    allBackupsOfType.sort((name1, name2) => {
      const ts1Match = name1.match(/\d*/);
      const ts2Match = name2.match(/\d*/);
      const ts1 = parseInt(ts1Match[0]);
      const ts2 = parseInt(ts2Match[0]);
      return ts2 - ts1;
    });
    const slicedBackupsOfType = allBackupsOfType.slice(0, maxBackupTypes);
    const backupsToDownload = slicedBackupsOfType.filter((backup) => !localBackups.includes(backup));
    return backupsToDownload;
  });
  const merged = [].concat.apply([], lists);
  return merged;
}

async function downloadRemoteBackups() {
  if (s3) {
    console.log('Downloading remote backups from AWS S3...');
    fs.ensureDirSync(BACKUP_FOLDER_PATH);
    const bucketContents = await s3.listObjects({
      Bucket: bucketName
    }).promise();
    const allRemoteArchives = bucketContents.Contents.map(entry => entry.Key);
    const allLocalArchives = await fs.readdir(BACKUP_FOLDER_PATH);
    const remoteBackupsToDownload = getRemoteBackupsToDownload(allRemoteArchives, allLocalArchives);
    await Promise.all(remoteBackupsToDownload.map(async (backup) => {
      const response = await s3.getObject({
        Bucket: bucketName,
        Key: backup
      }).promise();
      await fs.outputFile(`${BACKUP_FOLDER_PATH}/${backup}`, response.Body);
      console.log(`Downloaded ${backup}`);
    }));
    console.log(`Downloaded ${remoteBackupsToDownload.length} backup(s) from from AWS S3 bucket ${bucketName}`)
    await purgeOldLocalBackups();
  }
}

module.exports = {
  createBackupBucketIfNotExists,
  downloadRemoteBackups,
  createBackup,
  restoreLocalBackup,
  restoreLatestLocalBackup,
  createUnscheduledBackup
};
