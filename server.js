const fs = require('fs');
const os = require('os');
const assert = require('assert');
const {
  spawn
} = require('child_process');

const platform = os.platform();

const CONFIG_FILE_PATH = './config.json'

const {
  UNZIPPED_SERVER_FOLDER_PATH,
  downloadServerIfNotExists
} = require('./download-server.js')


const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
const config = JSON.parse(configFile);
assert(config.accept_official_minecraft_server_eula, "You must accept the minecraft EULA on https://www.minecraft.net/en-us/download/server/bedrock/ by setting the flag in the config file to true in order to use this software");


downloadServerIfNotExists(platform).then(() => {
  console.log('\nStarting Bedrock server...\n\n');

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

  bs.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  bs.stderr.on('data', (error) => {
    console.error(`Minecraft server error: ${error}`);
  });

  bs.on('close', (code) => {
    console.log(`Minecraft server child process exited with code ${code}`);
  });

}).catch((error) => {
  console.error(error);
});;
