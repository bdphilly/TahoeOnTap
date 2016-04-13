'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const wrap = require('co-express');
const User = mongoose.model('User');

/**
 * Load
 */

exports.load = wrap(function* (req, res, next, _id) {
  const criteria = { _id };
  req.profile = yield User.load({ criteria });
  if (!req.profile) return next(new Error('User not found'));
  next();
});

/**
 * Create user
 */

exports.create = wrap(function* (req, res) {
  const user = new User(req.body);
  user.provider = 'local';
  yield user.save();
  req.logIn(user, err => {
    if (err) req.flash('info', 'Sorry! We are not able to log you in!');
    return res.redirect('/');
  });
});

/**
 *  Show profile
 */

exports.show = function (req, res) {
  const user = req.profile;
  res.render('users/show', {
    title: user.name,
    user: user
  });
};

exports.signin = function () {};

/**
 * Auth callback
 */

exports.authCallback = login;

/**
 * Show login form
 */

exports.login = function (req, res) {
  res.render('users/login', {
    title: 'Login'
  });
};

/**
 * Show sign up form
 */

exports.signup = function (req, res) {
  res.render('users/signup', {
    title: 'Sign up',
    user: new User()
  });
};

/**
 * Logout
 */

exports.logout = function (req, res) {
  req.logout();
  res.redirect('/login');
};

/**
 * Session
 */

exports.session = login;

/**
 * Login
 */

function login (req, res) {
  const redirectTo = req.session.returnTo
    ? req.session.returnTo
    : '/';
  delete req.session.returnTo;
  res.redirect(redirectTo);
}

/**
 * List
 */

exports.index = wrap(function* (req, res) {

  const users = yield User.list();

  res.render('users/index', {
    title: 'Users',
    users: users
  });
});

/**
 * Update user / toggle isAdmin
 */

exports.adminToggle = wrap(function* (req, res){
  const userId = req.params.userId;

  console.log('id:', userId);
  
  const userToUpdate = yield User.findById(userId);

  console.log('userToUpdate', userToUpdate);
  console.log('admin??', userToUpdate.isAdmin);

  yield User.update(userToUpdate, { 'isAdmin': !userToUpdate.isAdmin });
  
  res.redirect('/users');
});