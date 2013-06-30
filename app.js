
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , consolidate = require('consolidate')  //Handlebars
  , mongoose = require('mongoose')
  , passport = require('passport');
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

  app.use(express.cookieParser());
  app.use(express.session({ secret: 'hakui is cool'}));

  app.use(passport.initialize());
  app.use(passport.session());
  
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));  //Removes "public" from url
});

app.configure('development', function(){

  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 

  // Connect mongoose
  mongoose.connect('mongodb://localhost/whereispulkit');
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

// Setup routes
require('./routes')(app, server);

//Start server
server.listen(app.get('port'), function(){
  console.log("Express server listening on %s:%d in %s mode", '127.0.0.1', app.get('port'), app.settings.env);
});
