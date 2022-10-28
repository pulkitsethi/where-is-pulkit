/**
 * Module dependencies.
 */

const express = require('express')
  , compression = require('compression')
  , bodyParser = require('body-parser')
  , favicon = require('serve-favicon')
  , serveStatic = require('serve-static')
  , errorHandler = require('errorhandler')
  , morgan = require('morgan')
  , rateLimit = require('express-rate-limit')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , Services = require('./config/services')
  , Location = require('./models/location');

const app = express();

//Configuration
app.set('port', process.env.PORT || 3000);

app.set('view engine', 'pug');
    
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json());
//app.use(express.methodOverride());
//app.use(favicon());
  
app.use(serveStatic(path.join(__dirname, 'public')));  //Removes "public" from url

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler({ dumpExceptions: true, showStack: true }));
    mongoose.connect(Services.mongodb.dev);
}

if (process.env.NODE_ENV === 'production') {
    app.use(errorHandler());
    mongoose.connect(Services.mongodb.prod);
}

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Prodcution settings for socket.io
if (process.env.NODE_ENV === 'production') {
    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    io.enable('browser client gzip');          // gzip the file
    io.set('log level', 1);                    // reduce logging
}

// Setup routes
require('./routes')(app, io);

//Start server
server.listen(app.get('port'), () => {
  console.log("Express server listening on %s:%d in %s mode", '127.0.0.1', app.get('port'), app.settings.env);
});
