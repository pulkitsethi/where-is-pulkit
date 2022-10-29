const NodeCache = require('node-cache')
    , path = require('path')
    , Location = require('./models/location')
    , Services = require('./config/services');

const got = import('got');

//Setup Application Level Cache
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

const convertLocationToGeoJsonLineString = (locations) => {
    //Converting locations into geoJSON multistring
    let coordinates = [];

    for(let key in locations){
        coordinates.push([locations[key].longitude, locations[key].latitude]);
    }

    const geoJSONLocations =  {
        "type": "LineString",
        "coordinates": coordinates
    }

    return geoJSONLocations;
}

const cacheLocations = (ttl, callback) => {
    Location.find().sort({timestamp: 1}).exec(function(err, locations){
        if(err){
            console.log("Error getting LOCATIONS");
        }

        const geoJSONLocations = convertLocationToGeoJsonLineString(locations);

        //Cache location
        let success = myCache.set("locations", geoJSONLocations, ttl);

        if(success){
            console.log("CACHING: Locations");
        }

        //Callback
        if (callback && typeof(callback) === "function") {
            // execute the callback, passing parameters as necessary
            callback(err, geoJSONLocations);
        }

    });
}

const cacheCheckins = (ttl, limit, callback) => {
   //Variables
    let localLimit = 250;
    const afterTimestamp = 1370034000;  //Epoch Seconds
    const beforeTimestamp = 1379278800;   //Epoch Seconds
    const oauth_token = Services.foursquare.oauth_token;
    const user_id = Services.foursquare.user_id;
    let checkins = null;
    
    //Get max number of checkins to return
    if(limit && (limit < 250)){
            localLimit = limit;
    }

    //Build GET Checkin URL
    const host = 'https://api.foursquare.com';

    const path = '/v2/users/' + user_id + '/checkins?v=20140212'
        + '&limit=' + localLimit
        + '&afterTimestamp=' + afterTimestamp
        + '&beforeTimestamp=' + beforeTimestamp
        + '&oauth_token=' + oauth_token;

    //Make request and return data
    got.get(host + path, {responseType: 'json'})
      .then(res => {
          //let body = JSON.parse(body);
          const checkins = res.body;

          //Cache checkins
          myCache.set("checkins", checkins, ttl, (err, success) => {
              if(!err && success){
                  console.log("CACHING: Checkins");
              }
          });

          //Callback
          if (callback && typeof(callback) === "function") {
              // execute the callback, passing parameters as necessary
              callback(false, checkins);
          }
      })
      .catch(err => {
          callback(err);
      });
}

const cachePhotos = (ttl, callback) => {
     //Variables
    const flickr_api_url = 'https://secure.flickr.com/services/rest';
    const method = 'flickr.photosets.getPhotos';
    const api_key = Services.flickr.api_key;
    const photoset_id = Services.flickr.photoset_id;
    const extras = 'geo%2C+url_t%2C+url_n%2C+url_c%2C+path_alias';
    const format = 'json';

    //Build GET Checking URL
    const flickr_photos_url = flickr_api_url + '/?' + 'method=' + method + '&api_key=' + api_key + '&photoset_id=' + photoset_id + '&extras=' + extras + '&format=' + format + '&nojsoncallback=1';

    let photos = null;
    
    //Make request and return data
    got.get(flickr_photos_url, {responseType: 'json'})
        .then(res => {
            photos = res.body;

            //Cache photos
            myCache.set("photos", photos, ttl, function(err, success){
                if(!err && success){
                    console.log("CACHING: Photos");
                }
            });

            //Callback
            if (callback && typeof(callback) === "function") {
                // execute the callback, passing parameters as necessary
                callback(false, photos);
            }
        })
        .catch(err => {
            callback(err);
        });
}

myCache.on( "expired", (key, value) => {
    console.log('EXPIRED - CHACHE: ' + key);
    
    if(key === 'locations'){
        cacheLocations(86400);
    } else if (key === 'checkins'){
        cacheCheckins(86400);   
    } else if (key === 'photos'){
        cachePhotos(86400);   
    }
});

module.exports = (app, io) => {

    //Set up socket
    //var io = require('socket.io').listen(server);

    app.get('/', (req, res) => {
        res.render('location', { title: 'Where Is Pulkit', user: req.user });
    });

    app.get('/location', (req, res) => {
        res.render('location', { title: 'Where Is Pulkit', user: req.user });
    });

    //Social Test
    app.get('/social', (req, res) =>{
        res.render('social', { title: 'Where Is Pulkit', user: req.user });
    });

    //Photos
    app.get('/photos', (req, res) => {
        let format = req.query.format;

        if(format === 'json'){
            res.json('photo', {title: 'Where Is Pulkit'});
        } else {
            res.render('photo', {title: 'Where Is Pulkit'});
        }
    });


    app.get('/admin/location', (req, res) => {

        Location.find( (err, locations) => {
            if(err){
                console.log("Error getting LOCATIONS"); //REPLACE WITH NICE 404??
            }

            res.render('admin/location', {title: 'Admin - Locations',  locations: locations});
        });

    });
    
    //------------API------------
    app.get('/api/get/location', (req, res) => {
        // Hard code Austin for now
        const points = [
            [-77.0369, 38.9072],	// DC
            [-84.3880, 33.7490],	// ATL
            [-90.0715, 29.9511],	// NOLA
            [-95.3698, 29.7604],	// Houston
            [-97.7431, 30.2672]		// Austin
        ];

        res.jsonp(points);

        /*
        //Creating response callback function
        let response = (err, locations) => {
            if(err) {
                res.send(500, { error: 'Error getting locations' });
            } else {
                res.jsonp({locations: locations});
            }
        }

        //Check if locations are cached
        myCache.get("locations", (err, value) => {
            
            //If not cached, grab fresh copy from DB and cache. Otherwise return cache
            if(err || (Object.keys(value).length === 0)){
                console.log('CACHE MISS: Locations');
                
                cacheLocations(86400, response);
            } else{
                console.log('CACHE HIT: Locations');
                
                res.jsonp({locations: value.locations});
            }
        });
        */
    });
    
    app.get('/api/get/checkins', (req, res) => {
        
        //Get limit from url query
        let limit = req.query.limit;
        
        //Creating response callback function
        let response = (err, checkins) => {
            if(err){
                res.jsonp(500, {error: 'Error getting checkins'}); 
            } else {
                //res.jsonp({checkins: checkins});
                res.jsonp(checkins);
            }
        }
        
        //Check if locations are cached
        let value = myCache.get("checkins");
            
        //If not cached, grab fresh copy from DB and cache. Otherwise return cache
        if(value === undefined || (Object.keys(value).length === 0)){
            console.log('CACHE MISS: Checkins');
                
            //Cache for 1 day
            cacheCheckins(86400, limit, response);
        } else{
            console.log('CACHE HIT: Checkins');
                
            //res.jsonp({checkins: value.checkins});
            res.jsonp(value.checkins);
        }

    });

    app.get('/api/get/photos', (req, res) => {
        //Creating response callback function
        const response = (err, photos) => {
            if(err){
                res.jsonp(500, {error: 'Error getting photos'}); 
            } else {
                //res.jsonp({checkins: checkins});
                res.jsonp(photos);
            }
        }
        
        //Check if locations are cached
        let value = myCache.get("photos");
            
        //If not cached, grab fresh copy from DB and cache. Otherwise return cache
        if(value === undefined || (Object.keys(value).length === 0)){
            console.log('CACHE MISS: Photos');
                
            //Cache for 1 day
            cachePhotos(86400, response);
        } else{
            console.log('CACHE HIT: Photos');
                
            //res.jsonp({checkins: value.photos});
            res.jsonp(value.photos);
        }

    });
    
    //Save location
    app.post('/api/save/location', (req, res) => {
        //Variables
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;
        const timestamp = req.body.timestamp;

        //Log input params
        console.log("Coordinates recieved: (" + latitude + "," + longitude + ")");

        let location = new Location({ latitude: latitude, longitude: longitude, timestamp: timestamp });

        //Saving location to database
        location.save( (err) => {

          if(err){
            res.send('FAIL');
          } else {
            res.send('SUCCESS');
          }

          console.log("Coordinates emitted: (" + latitude + "," + longitude + ")");
          io.sockets.emit('position-update', { lat: latitude, long: longitude });

        });
    });
    
};

