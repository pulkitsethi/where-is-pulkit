/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , consolidate = require('consolidate')  //Handlebars
  , mongoose = require('mongoose')
  , passport = require('passport')
  , Services = require('./config/services')
  , Location = require('./models/location');

var app = express();

//Configuration
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.engine('html', consolidate.handlebars);
  app.set('view engine', 'html');
    
  app.use(express.compress());
    
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  //app.use(express.cookieParser());
  //app.use(express.session({ secret: 'hakui is cool'}));

  app.use(passport.initialize());
  app.use(passport.session());
  
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));  //Removes "public" from url
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
    mongoose.connect(Services.mongodb.dev);
    
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
    mongoose.connect(Services.mongodb.prod);
});

var server = http.createServer(app);

var io = require('socket.io').listen(server);

// Prodcution settings for socket.io
if ('production' == app.get('env')) {
    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    io.enable('browser client gzip');          // gzip the file
    io.set('log level', 1);                    // reduce logging

    // enable all transports (optional if you want flashsocket support, please note that some hosting
    // providers do not allow you to create servers that listen on a port different than 80 or their
    // default port)
    io.set('transports', [
        'websocket'
      , 'flashsocket'
      , 'htmlfile'
      , 'xhr-polling'
      , 'jsonp-polling'
    ]);
}

// Setup routes
require('./routes')(app, server);

//Save location
app.post('/api/save/location', function(req, res){
    //Variables
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var timestamp = req.body.timestamp;

    //Log input params
    console.log("Coordinates recieved: (" + latitude + "," + longitude + ")");

    var location = new Location({ latitude: latitude, longitude: longitude, timestamp: timestamp });

    //Saving location to database
    location.save(function(err) {

      if(err){
        res.send('FAIL');
      } else {
        res.send('SUCCESS');
      }

      console.log("Coordinates emitted: (" + latitude + "," + longitude + ")");
      io.sockets.emit('position-update', { lat: latitude, long: longitude });

    });
});


//Start server
server.listen(app.get('port'), function(){
  console.log("Express server listening on %s:%d in %s mode", '127.0.0.1', app.get('port'), app.settings.env);
});
