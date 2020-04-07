const fs = require('fs');
const assert = require('assert');
const {
  Readable,
  Writable
} = require('stream');
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const {
  spawn
} = require('child_process');
const {
  CONFIG_FILE_PATH,
  UNZIPPED_SERVER_FOLDER_PATH,
  MS_IN_MIN,
  MS_IN_SEC,
  platform
} = require('./utils.js');
const {
  downloadServerIfNotExists
} = require('./download-server.js');
const {
  createServerProperties
} = require('./create-server-properties.js');


const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
const config = JSON.parse(configFile);
assert(config['accept-official-minecraft-server-eula'], "You must accept the minecraft EULA on https://www.minecraft.net/en-us/download/server/bedrock/ by setting the flag in the config file to true in order to use this software");

const backupConfig = config.backup;
assert(backupConfig, `Could not find field 'backup' at root of config`);

const backupFrequencyMS = backupConfig['backup-frequency-min'] * MS_IN_MIN;
const minBackupFrequencyMinutes = 10;
assert(backupFrequencyMS > MS_IN_MIN * minBackupFrequencyMinutes, `Expected backup['backup-frequency-min'] to be greater than ${minBackupFrequencyMinutes}`);
let isCurrentlyBackingUp = false;
const SAVE_QUERY_FREQUENCY = MS_IN_SEC * 5;

downloadServerIfNotExists(platform).then(() => {
  createServerProperties().then(() => {
    console.log('\nStarting Minecraft Bedrock server...\n\n');

    let bs = null;
    if (platform === 'linux') {
      bs = spawn('./bedrock_server', [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: UNZIPPED_SERVER_FOLDER_PATH
      });
    } else if (platform === 'win32') {
      throw 'Unimplemented';
    } else {
      throw 'Unsupported platform - must be Windows 10 or Ubuntu 18+ based';
    }

    let lastQueryWasSaveSucccessful = false;
    bs.stdout.on('data', (data) => {
      if (/^(A previous save has not been completed\.|Saving\.\.\.|Changes to the level are resumed\.)/i.test(data)) {
        // do nothing
      } else if (/^(Data saved\. Files are now ready to be copied\.)/i.test(data)) {
        isCurrentlyBackingUp = true;

        const backupTime = Math.floor(new Date() / 1000);

        const onBackupComplete = () => {
          isCurrentlyBackingUp = false;
          bs.stdin.write('save resume\r\n');
          console.log(`Created Backup based on server state at ${(new Date(backupTime * 1000)).toLocaleString()} (Unixtime: ${backupTime})`);
        }

        // TODO: Actually create backup
        onBackupComplete();
      } else {
        console.log(`${data.toString().replace(/\n$/, '')}`);
      }
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

    setInterval(() => {
      if (!hasSentStopCommand && !isCurrentlyBackingUp) {
        bs.stdin.write('save query\r\n');
      }
    }, SAVE_QUERY_FREQUENCY);

    setInterval(() => {
      if (!hasSentStopCommand && !isCurrentlyBackingUp) {
        bs.stdin.write('save hold\r\n');
      }
    }, backupFrequencyMS);


    let hasSentStopCommand = false;
    rl.on('line', (line) => {
      if (/^(stop|exit)/i.test(line)) {
        hasSentStopCommand = true;
        console.log('Sending stop command to Minecraft server...');
        bs.stdin.write('stop\r\n')
      }
    })
  });
}).catch((error) => {
  console.error(error);
});;
