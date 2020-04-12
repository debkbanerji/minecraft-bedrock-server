const fs = require('fs');
const assert = require('assert');
const {
  Readable,
  Writable
} = require('stream');
const readline = require('readline');
let {
  spawn
} = require('child_process');


const {
  CONFIG_FILE_PATH,
  UNZIPPED_SERVER_FOLDER_NAME,
  UNZIPPED_SERVER_FOLDER_PATH,
  BACKUP_TYPES,
  MS_IN_MIN,
  MS_IN_SEC,
  platform
} = require('./utils.js');
if (platform === 'win32') {
  spawn = require('cross-spawn');
}
const {
  downloadServerIfNotExists
} = require('./download-server.js');
const {
  createServerProperties
} = require('./create-server-properties.js');
const {
  createBackup,
  restoreLocalBackup,
  restoreLatestLocalBackup,
  createUnscheduledBackup
} = require('./backup.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});
const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
const config = JSON.parse(configFile);
assert(config['accept-official-minecraft-server-eula'], "You must accept the minecraft EULA on https://www.minecraft.net/en-us/download/server/bedrock/ by setting the flag in the config file to true in order to use this software");

const backupConfig = config.backup;
assert(backupConfig, `Could not find field 'backup' at root of config`);

const backupFrequencyMS = backupConfig['backup-frequency-minutes'] * MS_IN_MIN;
const minBackupFrequencyMinutes = 10;
assert(backupFrequencyMS > MS_IN_MIN * minBackupFrequencyMinutes, `Expected backup['backup-frequency-min'] to be greater than ${minBackupFrequencyMinutes}`);
let isCurrentlyBackingUp = false;
let hasSentStopCommand = false;
const SAVE_QUERY_FREQUENCY = MS_IN_SEC * 5;

let currentBackupType = null;

downloadServerIfNotExists(platform).then(() => {
  createServerProperties().then(async () => {
    console.log('\nRestoring latest local backup...');
    await restoreLatestLocalBackup();

    console.log('\nStarting Minecraft Bedrock server...\n');
    console.log(`!!!!!!!!!!\nWARNING: Use the 'stop' command to stop the server gracefully, or you may lose non backed up up data\n!!!!!!!!!!\n`);

    let bs = null;

    const spawnServer = () => {
      bs = spawn('./bedrock_server', [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: UNZIPPED_SERVER_FOLDER_PATH
      });

      bs.stderr.on('data', (error) => {
        console.error(`SERVER STDERROR: ${error}`);
      });

      bs.on('error', (data) => {
        console.log(`SERVER ERROR: ${data}`);
      });

      bs.on('close', (code) => {
        console.log(`Minecraft server child process exited with code ${code}`);
      });

      bs.stdout.on('data', async (data) => {
        if (/^(A previous save has not been completed\.|Saving\.\.\.|Changes to the level are resumed\.)/i.test(data)) {
          // do nothing
        } else if (/^(Data saved\. Files are now ready to be copied\.)/i.test(data)) {
          isCurrentlyBackingUp = true;

          const backupStartTime = Math.floor(new Date() / 1000);
          const backupType = currentBackupType;
          console.log(`Files ready for backup! Creating backup of server state at ${new Date(backupStartTime*MS_IN_SEC).toLocaleString()} with type ${backupType}...`);

          const dataSplit = data.toString().split('Data saved. Files are now ready to be copied.');
          backupFileListString = dataSplit[dataSplit.length - 1].replace(/(\n|\r|\\n|\\r)/g, '');
          await createBackup(backupFileListString, backupStartTime, backupType);
          isCurrentlyBackingUp = false;
          bs.stdin.write('save resume\r\n');
          // stop here, since the backup before stop has completed;
          if (hasSentStopCommand) {
            clearInterval(saveQueryInterval);
            clearInterval(saveHoldInterval);
            bs.stdin.write('stop\r\n');
            setTimeout(() => {
              process.exit(0);
            }, MS_IN_SEC);
          }
        } else {
          console.log(`${data.toString().replace(/\n$/, '')}`);
        }
      });
    }

    if (platform === 'linux') {
      spawnServer();
    } else {
      throw 'Unsupported platform - must be Ubuntu 18.3+ based';
    }

    let lastQueryWasSaveSucccessful = false;


    const saveQueryInterval = setInterval(() => {
      if (!isCurrentlyBackingUp && bs) {
        bs.stdin.write('save query\r\n');
      }
    }, SAVE_QUERY_FREQUENCY);

    const triggerBackup = (backupType) => {
      if (!hasSentStopCommand && !isCurrentlyBackingUp) {
        // don't backup if hasSentStopCommand is true
        console.log(`\nTelling server to prepare for backup...`);
        currentBackupType = backupType;
        bs.stdin.write('save hold\r\n');
      }
    }
    const saveHoldInterval = setInterval(triggerBackup, backupFrequencyMS, BACKUP_TYPES.SCHEDULED);

    const triggerGracefulExit = () => {
      console.log('\nBacking up, then killing Minecraft server...');
      hasSentStopCommand = true;
      currentBackupType = BACKUP_TYPES.ON_STOP;
      bs.stdin.write('save hold\r\n');
    }

    process.on('SIGINT', async () => {
      await createUnscheduledBackup(Math.floor(new Date() / 1000));
      process.exit(1);
    });

    rl.on('line', async (line) => {
      if (/^(stop|exit)$/i.test(line)) {
        triggerGracefulExit();
      } else if (/^(save.*)/i.test(line)) {
        // intercept saves
      } else if (/^(backup)/i.test(line)) {
        triggerBackup(BACKUP_TYPES.MANUAL);
      } else if (/^(force-restore)/i.test(line)) {
        const lineSplit = line.split('force-restore ');
        if (lineSplit.length > 0) {
          console.log('\n!!!!!!!!!!\nForcefully killing server and overwriting world state with specified backup - current world state will be lost');
          bs.stdin.write('stop\r\n');
          bs = null;
          setTimeout(async () => {
            const didSuccessfulyRestore = await restoreLocalBackup(lineSplit[1]);
            if (!didSuccessfulyRestore) {
              console.log('Unable to restore backup - restarting server as is');
            }
            spawnServer();
          }, 2 * MS_IN_SEC);
        } else {
          console.error('USAGE: restore <BACKUP_FILE_NAME>')
        }
      } else {
        console.log(`Unrecognized command: ${line}`);
        console.log('Recognized commands: backup, force-restore <BACKUP_FILE_NAME>, stop')
        // TODO: figure out how to pipe this to the server
      }
    })
  });
}).catch((error) => {
  console.error(error);
});
