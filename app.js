
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , consolidate = require('consolidate')  //Handlebars
  , mongoose = require('mongoose')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , GoogleStrategy = require('passport-google').Strategy;

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

  app.use(express.cookieParser());
  app.use(express.session({ secret: 'hakui is cool'}));

  app.use(passport.initialize());
  app.use(passport.session());
  
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));  //Removes "public" from url
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Configure passport
var Account = require('./models/account');

passport.use('local', new LocalStrategy(Account.authenticate()));

passport.use('google', new GoogleStrategy({
    returnURL: 'http://localhost:3000/auth/google/return',
    realm: 'http://localhost:3000/'
  },
  function(identifier, profile, done) {
    Account.findOne({ 'google.id': identifier }, function(err, user) {
      if(!user){
        // make a new google profile without key start with $
        var new_profile = {}
        new_profile.id = profile.id
        new_profile.displayName = profile.displayName
        new_profile.emails = profile.emails
        user = new Account({
            name: profile.displayName
          , email: profile.emails[0].value
          , username: profile.username
          , provider: 'google'
          , google: new_profile._json
        })
        user.save(function (err) {
          if (err) console.log(err)
          return done(err, user)
        })
      } else {
        done(err, user);
      }
    });
  }
));

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Connect mongoose
mongoose.connect('mongodb://localhost/whereispulkit');

// Setup routes
require('./routes')(app);

var server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log("Express server listening on %s:%d in %s mode", '127.0.0.1', app.get('port'), app.settings.env);
});

//Socket.IO
io = require('socket.io').listen(server);		//Starting socket.io app

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
