var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/mydb')

var userSchema = new mongoose.Schema({
	name : {
		first: {type: String, required: true},
		last: {type: String, required: true}
	},
	email : {
		type: String,
		required: true
	}
});

mongoose.model('User', userSchema);

mongoose.connect('')