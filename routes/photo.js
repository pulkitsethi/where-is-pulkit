/*
 * GET Photos
 */

exports.list = function(req, res){
	var format = req.query.format;

	if(format == 'json'){
		res.json('photo', {title: 'Where Is Pulkit'});
	} else {
		res.render('photo', {title: 'Where Is Pulkit'});
	}

};