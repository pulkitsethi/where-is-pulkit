module.exports = exports = function ts_created_plugin (schema, options) {

	schema.add({
    ts_created: {type: Date, 'default': Date.now }
  });

};