var passport = require('passport')
    , request = require('request')
    , Location = require('./models/location')
    , Services = require('./config/services')
    , NodeCache = require('node-cache');

//Setup Application Level Cache
var myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });


var cacheLocations = function (ttl, callback){
    Location.find().sort({timestamp: 1}).exec(function(err, locations){
        if(err){
            console.log("Error getting LOCATIONS");
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

        //Cache location
        myCache.set("locations", geoJSONLocations, ttl, function(err, success){
            if(!err && success){
                console.log("CACHING: Locations");   
            }
        });

        //Callback
        if (callback && typeof(callback) === "function") {
            // execute the callback, passing parameters as necessary
            callback(err, geoJSONLocations);
        }

    });
}

var cacheCheckins = function (ttl, limit, callback){
   //Variables
    var limit = 250;
    var afterTimestamp = 1370034000;  //Epoch Seconds
    var beforeTimestamp = 1379278800;   //Epoch Seconds
    var oauth_token = Services.foursquare.oauth_token;
    var user_id = Services.foursquare.user_id;
    var checkins = null;
    
    //Get max number of checkins to return
    if(limit && (limit < 250)){
            limit = limit;
    }

    //Build GET Checkin URL
    var host = 'https://api.foursquare.com';

    var path = '/v2/users/' + user_id + '/checkins?v=20140212' 
        + '&limit=' + limit 
        + '&afterTimestamp=' + afterTimestamp
        + '&beforeTimestamp=' + beforeTimestamp
        + '&oauth_token=' + oauth_token;

    //Make request and return data
    request.get(host + path, function(error, response, body){
        if (!error && response.statusCode == 200) {
            //Format data
            var body = JSON.parse(body);
            checkins = body;//.response.checkins;
            
            //Cache checkins
            myCache.set("checkins", checkins, ttl, function(err, success){
                if(!err && success){
                    console.log("CACHING: Checkins");   
                }
            });
        }
        
        //Callback
        if (callback && typeof(callback) === "function") {
            // execute the callback, passing parameters as necessary
            callback(error, checkins);
        }
        
    });
}

var cachePhotos = function(ttl, callback){
     //Variables
    var flickr_api_url = 'https://secure.flickr.com/services/rest';
    var method = 'flickr.photosets.getPhotos';
    var api_key = Services.flickr.api_key;
    var photoset_id = Services.flickr.photoset_id;
    var extras = 'geo%2C+url_t%2C+url_n%2C+url_c%2C+path_alias';
    var format = 'json';

    //Build GET Checking URL
    var flickr_photos_url = flickr_api_url + '/?' + 'method=' + method + '&api_key=' + api_key + '&photoset_id=' + photoset_id + '&extras=' + extras + '&format=' + format + '&nojsoncallback=1';

    var photos = null;
    
    //Make request and return data
    request.get(flickr_photos_url, function(error, response, body){
        if (!error && response.statusCode == 200) {
            
            //Format data
            var body = JSON.parse(body);
            photos = body;
            
            //Cache photos
            myCache.set("photos", photos, ttl, function(err, success){
                if(!err && success){
                    console.log("CACHING: Photos");   
                }
            });
            
        }
        
        //Callback
        if (callback && typeof(callback) === "function") {
            // execute the callback, passing parameters as necessary
            callback(error, photos);
        }
        
    });
}

myCache.on( "expired", function( key, value ){
    console.log('EXPIRED - CHACHE: ' + key);
    
    if(key === 'locations'){
        cacheLocations(86400);
    } else if (key === 'checkins'){
        cacheCheckins(86400);   
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
        
        //Creating response callback function
        var response = function(err, locations){
            if(err) {
                res.send(500, { error: 'Error getting locations' });
            } else {
                res.jsonp({locations: locations});
            }
        }

        //Check if locations are cached
        myCache.get("locations", function(err, value){
            
            //If not cached, grab fresh copy from DB and cache. Otherwise return cache
            if(err || (Object.keys(value).length === 0)){
                console.log('CACHE MISS: Locations');
                
                cacheLocations(86400, response);
            } else{
                console.log('CACHE HIT: Locations');
                
                res.jsonp({locations: value.locations});
            }
        });
    });
    
    app.get('/api/get/checkins', function(req, res){
        
        //Get limit from url query
        limit = req.query.limit;
        
        //Creating response callback function
        var response = function(err, checkins){
            if(err){
                res.jsonp(500, {error: 'Error getting checkins'}); 
            } else {
                //res.jsonp({checkins: checkins});
                res.jsonp(checkins);
            }
        }
        
        //Check if locations are cached
        myCache.get("checkins", function(err, value){
            
            //If not cached, grab fresh copy from DB and cache. Otherwise return cache
            if(err || (Object.keys(value).length === 0)){
                console.log('CACHE MISS: Checkins');
                
                //Cache for 1 day
                cacheCheckins(86400, limit, response);
            } else{
                console.log('CACHE HIT: Checkins');
                
                //res.jsonp({checkins: value.checkins});
                res.jsonp(value.checkins);
            }
        });

    });

    app.get('/api/get/photos', function(req, res){
        //Creating response callback function
        var response = function(err, photos){
            if(err){
                res.jsonp(500, {error: 'Error getting photos'}); 
            } else {
                //res.jsonp({checkins: checkins});
                res.jsonp(photos);
            }
        }
        
        //Check if locations are cached
        myCache.get("photos", function(err, value){
            
            //If not cached, grab fresh copy from DB and cache. Otherwise return cache
            if(err || (Object.keys(value).length === 0)){
                console.log('CACHE MISS: Photos');
                
                //Cache for 1 day
                cachePhotos(86400, response);
            } else{
                console.log('CACHE HIT: Photos');
                
                //res.jsonp({checkins: value.photos});
                res.jsonp(value.photos);
            }
        });
    });

};

