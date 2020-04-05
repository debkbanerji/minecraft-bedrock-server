// Creates the server properties from config.json
const assert = require('assert');
const fs = require('fs');
const {
  CONFIG_FILE_PATH,
  SERVER_PROPERTIES_FILE_PATH,
  SERVER_PROPERTIES_FIELDS
} = require('./utils.js')

const getServerPropertiesContentString = (serverProperties) => {
  return Object.keys(serverProperties).map((property) => `${property}=${serverProperties[property]}`).join('\n\n');
}

const createServerProperties = () => {

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
  console.log(content);

  console.log(`Updated ${SERVER_PROPERTIES_FILE_PATH} based on contents of ${CONFIG_FILE_PATH}`);
}

module.exports = {
  createServerProperties
};
