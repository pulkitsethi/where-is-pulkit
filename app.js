
/**
 * Module dependencies.
 */

var express = require('express')
  , site = require('./routes/site')
  , blog = require('./routes/blog')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , consolidate = require('consolidate');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('html', consolidate.handlebars);
app.set('view engine', 'html');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));	//Removes "public" from url

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//URL mapping
app.get('/', site.index);
app.get('/blog?:format', blog.list);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
