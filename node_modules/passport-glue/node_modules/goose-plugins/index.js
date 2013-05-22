var version = require('./package').version
  , ts_created = require('./lib/ts_created')
  , ts_modified = require('./lib/ts_modified');

module.exports.version = version;

module.exports.ts_created = ts_created;
module.exports.ts_modified = ts_modified;