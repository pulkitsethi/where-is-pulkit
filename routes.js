var passport = require('passport')
    , request = require('request')
    , Account = require('./models/account')
    , Location = require('./models/location')
    , NodeCache = require('node-cache');

//Setup Application Level Cache
var myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

myCache.on( "expired", function( key, value ){
    console.log('EXPIRED - CHACHE: ' + key);
    
    if(key === 'locations'){
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

            //Set cache for 1 day
            myCache.set("locations", geoJSONLocations, 86400, function(err, success){
                if(!err && success){
                    console.log("CACHING: Locations");   
                }
            });

        }); 
    }
});

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


    app.get('/admin/location', function(req, res){

        Location.find(function(err, locations){
            if(err){
                console.log("Error getting LOCATIONS"); //REPLACE WITH NICE 404??
            }

            res.render('admin/location', {title: 'Admin - Locations',  locations: locations});

        });

    });
    
    //------------API------------
    app.get('/api/get/location', function(req, res){
        //Log input params
        //console.log("Coordinates recieved: (" + req.body.latitude + "," + req.body.longitude + ")");

        //Check if path is cached
        myCache.get("locations", function(err, value){
            
            //If error OR returned empty object, grab fresh copy DB
            if(err || (Object.keys(value).length === 0)){
                console.log('CACHE MISS: Locations');

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

                    //Set cache for 1 day
                    myCache.set("locations", geoJSONLocations, 86400, function(err, success){
                        if(!err && success){
                            console.log("CACHING: Locations");   
                        }
                    });

                    //Render JSON
                    res.jsonp({locations: geoJSONLocations});

                });
            } else{
                console.log('CACHE HIT: Locations');
                res.jsonp({locations: value.locations});
            }
        });
    });
    
    app.get('/api/get/checkins', function(req, res){
        
        //Check if path is cached
        myCache.get("locations", function(err, value){
            //Variables
            var limit = 250;
            var afterTimestamp = 1370034000;  //Epoch Seconds
            var beforeTimestamp = 1379278800;   //Epoch Seconds
            var oauth_token = 'WX1FSFLPNCX105CIRFFFFJRONVRLIAAAIBLBJYGNALV0DLNU';   //TODO: Get from user object or database

            //Get max number of checkins to return
            if(req.query.limit && (req.query.limit < 250)){
                    limit = req.query.limit;
            }

            //Build GET Checkin URL
            var host = 'https://api.foursquare.com';

            var path = '/v2/users/56072394/checkins?v=20140212' 
                + '&limit=' + limit 
                + '&afterTimestamp=' + afterTimestamp
                + '&beforeTimestamp=' + beforeTimestamp
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

};

