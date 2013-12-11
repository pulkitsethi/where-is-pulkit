
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , consolidate = require('consolidate')  //Handlebars
  , mongoose = require('mongoose')
  , passport = require('passport')
  , Location = require('./models/location');
  //, LocalStrategy = require('passport-local').Strategy
  //, GoogleStrategy = require('passport-google').Strategy;

var app = express();

//Configuration
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.engine('html', consolidate.handlebars);
  app.set('view engine', 'html');

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

  // Connect mongoose
  //mongoose.connect('mongodb://localhost/whereispulkit');
  mongoose.connect('mongodb://nodejitsu:bb76e643bb93517a1ec1a299d3d4e771@alex.mongohq.com:10033/nodejitsudb642845281');
});

app.configure('production', function(){
  app.use(express.errorHandler()); 

  // Connect mongoose
  mongoose.connect('mongodb://nodejitsu:bb76e643bb93517a1ec1a299d3d4e771@alex.mongohq.com:10033/nodejitsudb642845281');
});

/**
// Configure passport
var Account = require('./models/account');

passport.use(new LocalStrategy(Account.authenticate()));

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());
**/

var server = http.createServer(app);

var io = require('socket.io').listen(server);

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

/**
  //Initializing to Springfield Mixing bowl
  newLat = 38.788345;
  newLong = -77.163849;

  
  //Mock position data emited every 3 seconds
  setInterval(function() {
    newLat = newLat + .001;
    newLong = newLong + .001;
    
    io.sockets.emit('position-update', { lat: newLat, long: newLong });
  }, 3000);
**/

/**
io.sockets.on('connection', function (socket) {
  //Initializing to Springfield Mixing bowl
  newLat = 38.788345;
  newLong = -77.163849;

  
  //Mock position data emited every 3 seconds
  setInterval(function() {
    newLat = newLat + .0001;
    newLong = newLong + .0001;
    
    socket.emit('position-update', { lat: newLat, long: newLong });
  }, 3000);
  

});
**/

//Start server
server.listen(app.get('port'), function(){
  console.log("Express server listening on %s:%d in %s mode", '127.0.0.1', app.get('port'), app.settings.env);
});
