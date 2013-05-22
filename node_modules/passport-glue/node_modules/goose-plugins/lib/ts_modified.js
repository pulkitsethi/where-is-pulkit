module.exports = exports = function ts_modified_plugin (schema, options) {

	schema.add({
    ts_modified: Date
  });

	schema.pre('save', function(next) {
		this.ts_modified = new Date();
		next();
	});

};