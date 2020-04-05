const fs = require('fs');
const os = require('os');
const assert = require('assert');
const https = require('https');
const unzipper = require('unzipper')
const util = require('util');


const UNZIPPED_SERVER_FOLDER_NAME = 'bedrock-server-1.14.32.1';
const UNZIPPED_SERVER_FOLDER_PATH = `./${UNZIPPED_SERVER_FOLDER_NAME}`;
const ZIPPED_SERVER_PATH = `${UNZIPPED_SERVER_FOLDER_PATH}.zip`;
const SERVER_EXECUTABLE_PATH = `${UNZIPPED_SERVER_FOLDER_PATH}/bedrock_server`;
const WINDOWS_SERVER_LINK = `https://minecraft.azureedge.net/bin-linux/${UNZIPPED_SERVER_FOLDER_NAME}.zip`;
const LINUX_SERVER_LINK = `https://minecraft.azureedge.net/bin-linux/${UNZIPPED_SERVER_FOLDER_NAME}.zip`;

const downloadServerIfNotExists = util.promisify((platform, callback) => {
  if (fs.existsSync(UNZIPPED_SERVER_FOLDER_PATH)) {
    console.log(`Minecraft server (${UNZIPPED_SERVER_FOLDER_PATH}) already exists - no need to redownload`)
    callback(null, false); // return false if the server already exists
  } else {
    const zippedWriteStream = fs.createWriteStream(ZIPPED_SERVER_PATH);
    let serverLink = null;
    if (platform === 'linux') {
      serverLink = LINUX_SERVER_LINK;
    } else if (platform === 'win32') {
      serverLink = WINDOWS_SERVER_LINK
    } else {
      throw 'Unsupported platform - must be Windows 10 or Ubuntu 18+ based';
    }
    console.log(`No Minecraft server (${UNZIPPED_SERVER_FOLDER_PATH}) found - redownloading`)
    const request = https.get(serverLink, (response) => {
      response.pipe(zippedWriteStream).on('finish', () => {
        const fileContents = fs.createReadStream(ZIPPED_SERVER_PATH);
        console.log(`Done downloading Minecraft zipped server from ${serverLink}`);
        fileContents.pipe(unzipper.Extract({
          path: UNZIPPED_SERVER_FOLDER_PATH
        })).on('finish', () => {
          console.log(`Unzipped server into ${UNZIPPED_SERVER_FOLDER_PATH}`);
          // Mark the executable with 'chmod +x'
          fs.chmodSync(SERVER_EXECUTABLE_PATH, '755');
          console.log(`Marked ${SERVER_EXECUTABLE_PATH} as executable`)
          callback(null, true); // return true if we had to redownload
        });
      });
    });
  }
})

module.exports = {
  UNZIPPED_SERVER_FOLDER_PATH,
  downloadServerIfNotExists
};
