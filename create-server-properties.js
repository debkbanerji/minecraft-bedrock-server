// Creates the server properties from config.json
const assert = require('assert');
const fs = require('fs');
const {
  CONFIG_FILE_PATH,
  SERVER_PROPERTIES_FILE_PATH,
  SERVER_PROPERTIES_FIELDS
} = require('./utils.js')

const createServerProperties = () => {

  const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
  const config = JSON.parse(configFile);
  const configProperties = config['server-properties'];
  assert(configProperties, `Expected to find server-properties in ${CONFIG_FILE_PATH}`);

  actualConfigProperties = Object.keys(configProperties);

  // check that the fields are what we expect
  actualConfigProperties.sort();
  SERVER_PROPERTIES_FIELDS.sort();
  assert.deepEqual(actualConfigProperties, SERVER_PROPERTIES_FIELDS, `Expected fields in config['server-properties'] to be the same as those defined in ./utils.js`)

  console.log(`Updated ${SERVER_PROPERTIES_FILE_PATH} based on contents of ${CONFIG_FILE_PATH}`);
}

module.exports = {
  createServerProperties
};
