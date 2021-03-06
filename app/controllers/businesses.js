'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const assign = require('object-assign');
const wrap = require('co-express');
const only = require('only');
const Business = mongoose.model('Business');

/**
 * Load
 */

exports.load = wrap(function* (req, res, next, id) {
  req.business = yield Business.load(id);
  if (!req.business) return next(new Error('Business not found'));
  next();
});

/**
 * List
 */

exports.index = wrap(function* (req, res) {
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const limit = 30;
  const options = {
    limit: limit,
    page: page
  };

  const businesses = yield Business.list(options);
  const count = yield Business.count();

  res.render('businesses/index', {
    title: 'Businesses',
    businesses: businesses,
    page: page + 1,
    pages: Math.ceil(count / limit)
  });
});

/**
 * New business
 */

exports.new = function (req, res){
  res.render('businesses/new', {
    title: 'New Business',
    business: new Business({})
  });
};

/**
 * Create a business
 * Upload an image
 */

exports.create = wrap(function* (req, res) {
  console.log('=====>req.body', req.body);
  const business = new Business(only(req.body, 'name description tags'));
  console.log('req.files', req.files);
  // const images = req.files
  //   ? [req.files]
  //   : undefined;

  business.user = req.user;
  var test = yield business.uploadAndSave(req.files);
  console.log('test', test);
  req.flash('success', 'Successfully created business!');
  res.redirect('/businesses/' + business._id);
});

/**
 * Edit a business
 */

exports.edit = function (req, res) {
  res.render('businesses/edit', {
    name: 'Edit ' + req.business.name,
    business: req.business
  });
};

/**
 * Update business
 */

exports.update = wrap(function* (req, res){
  const business = req.business;
  const images = req.files.image
    ? [req.files.image]
    : undefined;

  assign(business, only(req.body, 'name description tags'));
  yield business.uploadAndSave(images);
  res.redirect('/businesses/' + business._id);
});

/**
 * Show
 */

exports.show = function (req, res){
  res.render('businesses/show', {
    name: req.business.name,
    business: req.business
  });
};

/**
 * Delete a business
 */

exports.destroy = wrap(function* (req, res) {
  yield req.business.remove();
  req.flash('success', 'Deleted successfully');
  res.redirect('/businesses');
});
