// Creates the server properties from config.json
const assert = require('assert');
const fs = require('fs');
const util = require('util');
const {
  CONFIG_FILE_PATH,
  SERVER_PROPERTIES_FILE_PATH,
  SERVER_PROPERTIES_FIELDS
} = require('./utils.js')

const getServerPropertiesContentString = (serverProperties) => {
  return Object.keys(serverProperties).map((property) => `${property}=${serverProperties[property]}`).join('\n\n');
}

const createServerProperties = util.promisify((callback) => {

  const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
  const config = JSON.parse(configFile);
  const configServerProperties = config['server-properties'];
  assert(configServerProperties, `Expected to find server-properties in ${CONFIG_FILE_PATH}`);

  actualConfigServerPropertyFields = Object.keys(configServerProperties);

  // check that the fields are what we expect
  actualConfigServerPropertyFields.sort();
  SERVER_PROPERTIES_FIELDS.sort();
  assert.deepEqual(actualConfigServerPropertyFields, SERVER_PROPERTIES_FIELDS, `Expected fields in config['server-properties'] to be the same as those defined in ./utils.js`)

  const content = getServerPropertiesContentString(configServerProperties);

  console.log(SERVER_PROPERTIES_FILE_PATH)
  fs.writeFileSync(SERVER_PROPERTIES_FILE_PATH, content);

  console.log(`Overwrote ${SERVER_PROPERTIES_FILE_PATH} based on contents of ${CONFIG_FILE_PATH}`);
  callback();
});

module.exports = {
  createServerProperties
};
