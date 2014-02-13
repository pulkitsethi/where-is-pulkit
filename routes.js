var passport = require('passport')
    , request = require('request')
    , Account = require('./models/account')
    , Location = require('./models/location')
    , Blog = require('./models/blog');


module.exports = function(app, server) {

    //Set up socket
    //var io = require('socket.io').listen(server);

    app.get('/', function(req, res){
        res.render('location', { title: 'Where Is Pulkit', user: req.user });
    });

    app.get('/location', function(req, res){
        res.render('location', { title: 'Where Is Pulkit', user: req.user });
    });

    //Social Test
    app.get('/social', function(req, res){
        res.render('social', { title: 'Where Is Pulkit', user: req.user });
    });


    //Photos
    app.get('/photos', function(req, res){
        var format = req.query.format;

        if(format == 'json'){
            res.json('photo', {title: 'Where Is Pulkit'});
        } else {
            res.render('photo', {title: 'Where Is Pulkit'});
        }
    });

    var blog = require('./routes/blog');

    //Blog
    //app.get('/blog', blog.list);
    app.get('/blog', function(req,res){
        var format = req.query.format;

        //Retrieve all blog posts and display
        Blog.find(function (err, posts){
            if(err){
                console.log("Error getting POSTS"); //REPLACE WITH NICE 404??
            }

            //Render data
            if(format == 'json'){
                res.json('blog', {title: 'Where Is Pulkit', posts: posts  });
            } else {
                res.render('blog', {title: 'Where Is Pulkit', posts: posts });
            }

        });

        //res.render('blog', {title: 'Where Is Pulkit', posts: Blog.find() });
    });

    //ADMIN
    app.get('/admin/blog/create', function(req,res){
        res.render('blog/create.html');
    });

    app.get('/admin/location', function(req, res){

        Location.find(function(err, locations){
            if(err){
                console.log("Error getting LOCATIONS"); //REPLACE WITH NICE 404??
            }

            res.render('admin/location', {title: 'Admin - Locations',  locations: locations});

        });

    });

    app.get('/api/save/location', function(req,res){
        res.render('testLocationAPI');
    });

    //---------------------API

    /**
    //Save location
    app.post('/api/save/location', function(req, res){
        //Variables
        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var timestamp = req.body.timestamp;

        //Log input params
        console.log("Coordinates recieved: (" + latitude + "," + longitude + ")");

        location = new Location({ latitude: latitude, longitude: longitude, timestamp: timestamp });

        //Saving location to database
        location.save(function(err) {

                if(err){
                    res.send('FAIL');
                } else{
                    res.send('SUCCESS');
                }

                console.log('TRYING TO EMIT');

                //Emit new location to other users
                io.sockets.on('connection', function (socket) {
                  console.log("Coordinates emitted: (" + latitude + "," + longitude + ")");
                  socket.emit('position-update', { lat: latitude, long: longitude });
                });

        });
    });
    **/

    //Get location
    app.get('/api/get/location', function(req, res){
        //Log input params
        //console.log("Coordinates recieved: (" + req.body.latitude + "," + req.body.longitude + ")");

        //location = new Location({ latitude: req.body.latitude, longitude: req.body.longitude, timestamp: req.body.timestamp });


        //var bQuery = new Date().getTime();

        Location.find().sort({timestamp: 1}).exec(function(err, locations){
            if(err){
                console.log("Error getting LOCATIONS"); //REPLACE WITH NICE 404??
            }

            //var aQuery = new Date().getTime();
            //var queryDiff = aQuery - bQuery;
            //console.log('Time to query: ' + queryDiff);

            //Converting locations into geoJSON multistring
            var coordinates = [];

            //var n1 = new Date().getTime();

            for(key in locations){
                coordinates.push([locations[key].longitude, locations[key].latitude]);
            }

            //var n2 = new Date().getTime();

            var geoJSONLocations =  { 
                "type": "LineString",
                "coordinates": coordinates
            }

            //console.log(geoJSONLocations);

            //var diff = n2 - n1;         
            //console.log("Time to convert points: " + diff);
            //var n3 = new Date().getTime();

            //Render JSON
            res.jsonp({locations: geoJSONLocations});

            //var n4 = new Date().getTime();
            //var diffRender = n4 - n3;
            //console.log("Time to render json: " + diffRender);
        });
    });

    //Get location
    app.get('/api/get/currentLocation', function(req, res){
        //Log input params

        Location.find().sort({timestamp: 1}).exec(function(err, locations){
            if(err){
                console.log("Error getting LOCATIONS"); //REPLACE WITH NICE 404??
            }

            //Converting locations into geoJSON multistring
            var coordinates = [];

            for(key in locations){
                coordinates.push([locations[key].longitude, locations[key].latitude]);
            }

            var geoJSONLocations =  { 
                "type": "LineString",
                "coordinates": coordinates
            }

            //console.log(geoJSONLocations);

            //Render JSON
            res.jsonp({locations: geoJSONLocations});

        });
    });
    
    app.get('/api/get/checkins', function(req, res){
       
        //Variables
        var limit = 250;
        var oauth_token = 'WX1FSFLPNCX105CIRFFFFJRONVRLIAAAIBLBJYGNALV0DLNU';   //TODO: Get from user object or database
        
        //Get max number of checkins to return
        if(req.query.limit && (req.query.limit < 250)){
                limit = req.query.limit;
        }
        
        //Build GET Checkin URL
        var host = 'https://api.foursquare.com';
        
        var path = '/v2/users/56072394/checkins?v=20140212' 
            + '&limit=' + limit 
            + '&oauth_token=' + oauth_token;
        
        //Make request and return data
        request.get(host + path, function(error, response, body){
            if (!error && response.statusCode == 200) {
                res.send(JSON.parse(body));
            } else {
                res.jsonp({error: response.statusCode});   
            }
        });

    });

    app.get('/api/get/photos', function(req, res){
         //Variables
        var flickr_api_url = 'https://secure.flickr.com/services/rest';
        var method = 'flickr.photosets.getPhotos';
        var api_key = '4dda8f378cd2863df1fa1fdb7a8cb9d4';           //TODO: Move to database
        var default_api_key = '17e92ae42d3b19b4dd753e4a70090b8f';   //TODO: Move to database
        var photoset_id = '72157634661787837';
        var extras = 'geo%2C+url_t%2C+url_n%2C+url_c%2C+path_alias';
        var format = 'json';

        //Build GET Checking URL
        var flickr_photos_url = flickr_api_url + '/?' + 'method=' + method + '&api_key=' + api_key + '&photoset_id=' + photoset_id + '&extras=' + extras + '&format=' + format + '&nojsoncallback=1';
        
        //Make request and return data
        request.get(flickr_photos_url, function(error, response, body){
            if (!error && response.statusCode == 200) {
                res.send(JSON.parse(body));
            } else {
                res.jsonp({error: response.statusCode});   
            }
        });

    });
    
    app.get('/client/location', function(req,res){
        res.render('client-location');
    });

};


//Authentication
    /**
    app.get('/register', function(req, res) {
        res.render('register', { });
    });

    app.post('/register', function(req, res) {
        Account.register(new Account({ 
            firstName: req.body.first,
            lastName: req.body.last,
            username : req.body.username, 
            email: req.body.email,
            provider: 'local'}), req.body.password, function(err, account) {

                if (err) {
                    return res.render('register', { account : account });
                }

                res.redirect('/approval-pending');
        });
    });

    app.get('/login', function(req, res) {
        res.render('login', { user : req.user });
    });

    app.post('/login', passport.authenticate('local'), function(req, res) {
        res.redirect('/');
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    app.get('/approval-pending', function(req, res) {
        res.send('Approval is pending...');
    });


    //Autenticates index page

    app.get('/', passport.authenticate('local', {failureRedirect: '/login', successRedirect: '/'}), function (req, res) {
        //if(req.user){
            res.render('index', { user : req.user });
        //} else {
        //    res.redirect('/login');
        //}
    });
    
    **/

//URL mapping
/*
app.get('/', site.index);
app.get('/blog?:format', blog.list);
app.get('/users', user.list);
app.get('/photos', photo.list);
app.get('/login', login.index);
*/