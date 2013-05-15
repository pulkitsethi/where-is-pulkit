
/* Fake blog post */
var posts = [
	{ 
	  title: 'Winter Haiku', 
	  body: 'I wake, reluctant<br>Too cold to get out of bed<br>But I need to pee', 
	  date: '5/25/2013 9:00 PM' 
	},
	{ 
	  title: 'Dilemma of the Big-Boned', 
	  body: 'fat man sees small door<br>he knows he cannot fit through door<br>tears flow free now', 
	  date: '5/26/2013 9:00 PM' 
	},
	{ 
	  title: 'Geometry Romance', 
	  body: 'A hypotenuse<br>Is on the opposite side<br>Of the right angle.', 
	  date: '5/27/2013 9:00 PM' 
	},
	{ 
	  title: 'Nonsense of Nonsense', 
	  body: "Haikus are easy<br>But sometimes they don't make sense<br>Refigerator", 
	  date: '5/28/2013 9:00 PM' 
	},
	{ 
	  title: 'Silverware Snobs', 
	  body: 'A white plastic spork<br>Met 3 silver spoons last night<br>stuck-up spoons are dumb', 
	  date: '5/29/2013 9:00 PM' 
	},
	{ 
	  title: 'Haiku-4-U', 
	  body: "\"Love tap\" my ass<br>You kicked my beautiful head<br>I don't call that love", 
	  date: '5/30/2013 9:00 PM' 
	},
	{ 
	  title: "The Hoff", 
	  body: "Which one should I do?<br>Wax my chest or perm my hair?<br>Can't wait to decide", 
	  date: '6/1/2013 9:00 PM' 
	}
];


/*
 * GET Blog
 */

exports.list = function(req, res){
	var format = req.query.format;

	if(format == 'json'){
		res.json('blog', {title: 'Blog', posts: posts });
	} else {
		res.render('blog', {title: 'Blog', posts: posts });
	}

};