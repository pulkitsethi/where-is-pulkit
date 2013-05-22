var passport = require('passport'),
    Account = require('./models/account');

module.exports = function (app) {
    
    app.get('/', function (req, res) {
        if(req.user){
            res.render('index', { user : req.user });
        } else {
            res.redirect('/login');
        }
    });

    app.get('/register', function(req, res) {
        res.render('register', { });
    });

    app.post('/register', function(req, res) {
        Account.register(new Account({ 
            username : req.body.username, 
            name: req.body.name,
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

    app.post('/auth/local', 
        passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' })
    );

    app.get('/auth/google', passport.authenticate('google'));

    app.get('/auth/google/return', 
        passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' })
    );

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    app.get('/approval-pending', function(req, res) {
        res.send('Approval is pending...');
    });
};

//URL mapping
/*
app.get('/', site.index);
app.get('/blog?:format', blog.list);
app.get('/users', user.list);
app.get('/photos', photo.list);
app.get('/login', login.index);
*/