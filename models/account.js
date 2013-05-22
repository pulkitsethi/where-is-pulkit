var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var AccountSchema = new Schema({
    name: String,
    email: String,
    google: {},
    facebook: {},
    provider: { type: String, default: 'local'},
    approved: { type: Boolean, default: false },
    datecreated: {type: Date, default: Date.now}
});

AccountSchema.plugin(passportLocalMongoose);

/*AccountSchema.statics.findOrCreate = function(openId, callback){
	return this.save({ openId: openId}, callback);
}*/

module.exports = mongoose.model('Account', AccountSchema);

