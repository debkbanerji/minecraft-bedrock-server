const os = require('os');

const CONFIG_FILE_PATH = './config.json'
const cjson = require(CONFIG_FILE_PATH);


const UNZIPPED_SERVER_FOLDER_NAME = `bedrock-server-${cjson['minecraft-server-version']}`;
const UNZIPPED_SERVERS_CONTAINER = './servers'
const UNZIPPED_SERVER_FOLDER_PATH = `${UNZIPPED_SERVERS_CONTAINER}/${UNZIPPED_SERVER_FOLDER_NAME}`;
const ZIPPED_SERVER_PATH = `${UNZIPPED_SERVER_FOLDER_PATH}.zip`;
const SERVER_EXECUTABLE_PATH = `${UNZIPPED_SERVER_FOLDER_PATH}/bedrock_server`;
const WINDOWS_SERVER_LINK = `https://minecraft.azureedge.net/bin-win/${UNZIPPED_SERVER_FOLDER_NAME}.zip`;
const LINUX_SERVER_LINK = `https://minecraft.azureedge.net/bin-linux/${UNZIPPED_SERVER_FOLDER_NAME}.zip`;
const BACKUP_FOLDER_NAME = 'backups'
const BACKUP_FOLDER_PATH = `./${BACKUP_FOLDER_NAME}`;
const SERVER_WORLDS_FOLDER_NAME = 'worlds';
const SERVER_WORLDS_FOLDER_PATH = `${UNZIPPED_SERVER_FOLDER_PATH}/${SERVER_WORLDS_FOLDER_NAME}`;
const SERVER_PROPERTIES_FILE_NAME = 'server.properties';
const SERVER_PROPERTIES_FILE_PATH = `${UNZIPPED_SERVER_FOLDER_PATH}/${SERVER_PROPERTIES_FILE_NAME}`;
const SERVER_PROPERTIES_FIELDS = [
  'server-name',
  'gamemode',
  'difficulty',
  'allow-cheats',
  'max-players',
  'online-mode',
  'white-list',
  'server-port',
  'server-portv6',
  'view-distance',
  'tick-distance',
  'player-idle-timeout',
  'max-threads',
  'level-name',
  'default-player-permission-level',
  'texturepack-required',
  'content-log-file-enabled',
  'compression-threshold',
  'server-authoritative-movement',
  'player-movement-score-threshold',
  'player-movement-distance-threshold',
  'player-movement-duration-threshold-in-ms',
  'correct-player-movement',
  'level-seed'
];
const SEC_IN_MIN = 60;
const MS_IN_SEC = 1000;
const MS_IN_MIN = MS_IN_SEC * SEC_IN_MIN;
const BUCKET_LOCK_FILE_NAME = 'BUCKET_LOCK.txt'
const BUCKET_LOCK_FILE_CONTENTS_PATH='./LOCK_FILE_TEXT.txt'


const platform = os.platform();

const BACKUP_TYPES = Object.freeze({
  'SCHEDULED': 'SCHEDULED',
  'MANUAL': 'MANUAL',
  'ON_STOP': 'ON_STOP',
  'ON_FORCED_STOP':'ON_FORCED_STOP'
});
const BACKUP_TYPE_REGEX_FRAGMENT = `(${Object.keys(BACKUP_TYPES).join('|')})`;

function formatBytes(a, b = 3) {
    if (0 === a) return "0 Bytes";
    const c = 0 > b ? 0 : b,
        d = Math.floor(Math.log(a) / Math.log(1024));
    return (
        parseFloat((a / Math.pow(1024, d)).toFixed(c)) +
        " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
    );
}


module.exports = {
  CONFIG_FILE_PATH,
  UNZIPPED_SERVERS_CONTAINER,
  UNZIPPED_SERVER_FOLDER_NAME,
  UNZIPPED_SERVER_FOLDER_PATH,
  ZIPPED_SERVER_PATH,
  SERVER_EXECUTABLE_PATH,
  WINDOWS_SERVER_LINK,
  LINUX_SERVER_LINK,
  BACKUP_FOLDER_NAME,
  BACKUP_FOLDER_PATH,
  BACKUP_TYPES,
  BACKUP_TYPE_REGEX_FRAGMENT,
  SERVER_WORLDS_FOLDER_NAME,
  SERVER_WORLDS_FOLDER_PATH,
  SERVER_PROPERTIES_FILE_NAME,
  SERVER_PROPERTIES_FILE_PATH,
  SERVER_PROPERTIES_FIELDS,
  SEC_IN_MIN,
  MS_IN_SEC,
  MS_IN_MIN,
  BUCKET_LOCK_FILE_NAME,
  BUCKET_LOCK_FILE_CONTENTS_PATH,
  formatBytes,
  platform
}
