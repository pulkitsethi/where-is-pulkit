/** User Schema for CrowdNotes **/

var glue = require('passport-glue');

var userSchema = glue.userSchema;
userSchema.plugin(glue.github_oauth2_plugin);
userSchema.plugin(glue.persistent_sessions_plugin);

mongoose.model('User', userSchema);
