var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


var locationSchema = new Schema({
    latitude: Number,
    longitude: Number,
    timestamp: Date
});

locationSchema.post('save', function (doc) {
	console.log("Coordinates saved: (" + doc.latitude + "," + doc.longitude + ")");
});

module.exports = mongoose.model('location', locationSchema);