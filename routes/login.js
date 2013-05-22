
/*
 * POST home page.
 */

exports.index = function(req, res){
  res.render('login', { title: 'Where Is Pulkit?', 
  						activity: 'Driving',
  						city: 'Washington, DC',
  						temperature: '74 C',
  						mood: 'Happy' 
  					});
};