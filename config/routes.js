'use strict';

/*!
 * Module dependencies.
 */

// Note: We can require users, articles and other cotrollers because we have
// set the NODE_PATH to be ./app/controllers (package.json # scripts # start)

const users = require('../app/controllers/users');
const businesses = require('../app/controllers/businesses');
const articles = require('../app/controllers/articles');
const comments = require('../app/controllers/comments');
const tags = require('../app/controllers/tags');
const auth = require('./middlewares/authorization');

const multer = require('multer');
const upload = multer({dest: 'uploads/'});
// const csrf = require('csurf');
// const csrfProtection = csrf({ cookie: true })


const testMe = function (req, res, next) {
  console.log('........in the test!');
  return next();
};



/**
 * Route middlewares
 */

const articleAuth = [auth.requiresLogin, auth.article.hasAuthorization];
const businessAuth = [auth.requiresLogin, auth.business.hasAuthorization];
const commentAuth = [auth.requiresLogin, auth.comment.hasAuthorization];

/**
 * Expose routes
 */

module.exports = function (app, passport) {

  // user routes
  app.get('/login', users.login);
  app.get('/signup', users.signup);
  app.get('/users', users.index);
  app.get('/logout', users.logout);
  app.post('/users', users.create);
  app.put('/users/:userId/admin-toggle', auth.requiresLogin, auth.user.ensureAdmin, users.adminToggle);
  app.post('/users/session',
    passport.authenticate('local', {
      failureRedirect: '/login',
      failureFlash: 'Invalid email or password.'
    }), users.session);
  app.get('/users/:userId', users.show);
  app.get('/auth/google',
    passport.authenticate('google', {
      failureRedirect: '/login',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    }), users.signin);
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/login'
    }), users.authCallback);

  app.param('userId', users.load);

  // article routes
  app.param('articleId', articles.load);
  app.get('/articles', articles.index);
  app.get('/articles/new', auth.requiresLogin, testMe, articles.new);
  app.post('/articles', auth.requiresLogin, testMe, articles.create);
  app.get('/articles/:articleId', articles.show);
  app.get('/articles/:articleId/edit', articleAuth, articles.edit);
  app.put('/articles/:articleId', articleAuth, articles.update);
  app.delete('/articles/:articleId', articleAuth, articles.destroy);

  // business routes
  app.param('businessId', businesses.load);
  app.get('/businesses', businesses.index);
  app.get('/businesses/new', auth.requiresLogin, businesses.new);
  app.post('/businesses', auth.requiresLogin, businesses.create);
  app.get('/businesses/:businessId', businesses.show);
  app.get('/businesses/:businessId/edit', businessAuth, businesses.edit);
  app.put('/businesses/:businessId', businessAuth, businesses.update);
  app.delete('/businesses/:businessId', businessAuth, businesses.destroy);  

  // home route
  app.get('/', businesses.index);

  // comment routes
  app.param('commentId', comments.load);
  app.post('/articles/:articleId/comments', auth.requiresLogin, comments.create);
  app.get('/articles/:articleId/comments', auth.requiresLogin, comments.create);
  app.delete('/articles/:articleId/comments/:commentId', commentAuth, comments.destroy);

  // tag routes
  app.get('/tags/:tag', tags.index);


  /**
   * Error handling
   */

  app.use(function (err, req, res, next) {
    // treat as 404
    if (err.message
      && (~err.message.indexOf('not found')
      || (~err.message.indexOf('Cast to ObjectId failed')))) {
      return next();
    }

    console.error(err.stack);

    if (err.stack.includes('ValidationError')) {
      res.status(422).render('422', { error: err.stack });
      return;
    }

    // error page
    res.status(500).render('500', { error: err.stack });
  });

  // assume 404 since no middleware responded
  app.use(function (req, res) {
    res.status(404).render('404', {
      url: req.originalUrl,
      error: 'Not found'
    });
  });
};
