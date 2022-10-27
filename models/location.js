const mongoose = require('mongoose'),
    Schema = mongoose.Schema;


const locationSchema = new Schema({
    latitude: Number,
    longitude: Number,
    timestamp: Date
});

locationSchema.post('save', (doc) => {
	console.log("Coordinates saved: (" + doc.latitude + "," + doc.longitude + ")");
});

module.exports = mongoose.model('location', locationSchema);