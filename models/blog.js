var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var postSchema = new Schema({
    title: String,
    date: Date,
    body: String
});

module.exports = mongoose.model('post', postSchema);