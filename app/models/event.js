'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const notify = require('../mailer');
const EVENT_TYPES = require('../../../tahoeontap/config/constants').EVENT_TYPES;
// const Imager = require('imager');
// const config = require('../../config/config');
// const imagerConfig = require(config.root + '/config/imager.js');

const Schema = mongoose.Schema;

const getTags = tags => tags.join(',');
const setTags = tags => tags.split(',');

/**
 * Article Schema
 */

const EventSchema = new Schema({
  title: { type : String, default : '', trim : true },
  description: { type : String, default : '', trim : true },
  user: { type : Schema.ObjectId, ref : 'User' },
  type: { type : String, default : EVENT_TYPES.RECURRING },
  tags: { type: [], get: getTags, set: setTags },
  image: {
    cdnUri: String,
    files: []
  },
  date: { type: Date, default : null },
  createdAt  : { type : Date, default : Date.now }
});

/**
 * Validations
 */

EventSchema.path('title').required(true, 'Article title cannot be blank');
EventSchema.path('description').required(true, 'Event description cannot be blank');

/**
 * Pre-remove hook
 */

EventSchema.pre('remove', function (next) {
  // const imager = new Imager(imagerConfig, 'S3');
  // const files = this.image.files;

  // if there are files associated with the item, remove from the cloud too
  // imager.remove(files, function (err) {
  //   if (err) return next(err);
  // }, 'article');

  next();
});

/**
 * Methods
 */

EventSchema.methods = {

  /**
   * Save article and upload image
   *
   * @param {Object} images
   * @api private
   */

  uploadAndSave: function (images) {
    // console.log('images: ', images);
    const err = this.validateSync();
    if (err && err.toString()) throw new Error(err.toString());
    return this.save();

    // console.log('images length', images.length);
    // if (images && !images.length) return this.save();
    // const imager = new Imager(imagerConfig, 'S3');
    // console.log('in the imager', imager);
    // imager.upload(images, function (err, cdnUri, files) {
    //   if (err) return cb(err);
    //   if (files.length) {
    //     self.image = { cdnUri : cdnUri, files : files };
    //   }
    //   self.save(cb);
    // }, 'article');
    
  },

  /**
   * Add comment
   *
   * @param {User} user
   * @param {Object} comment
   * @api private
   */

  addComment: function (user, comment) {
    this.comments.push({
      body: comment.body,
      user: user._id
    });

    if (!this.user.email) this.user.email = 'email@product.com';

    notify.comment({
      article: this,
      currentUser: user,
      comment: comment.body
    });

    return this.save();
  },

  /**
   * Remove comment
   *
   * @param {commentId} String
   * @api private
   */

  removeComment: function (commentId) {
    const index = this.comments
      .map(comment => comment.id)
      .indexOf(commentId);

    if (~index) this.comments.splice(index, 1);
    else throw new Error('Comment not found');
    return this.save();
  }
};

/**
 * Statics
 */

EventSchema.statics = {

  /**
   * Find article by id
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function (_id) {
    return this.findOne({ _id })
      .populate('user', 'name email username')
      .populate('comments.user')
      .exec();
  },

  /**
   * List articles
   *
   * @param {Object} options
   * @api private
   */

  list: function (options) {
    const criteria = options.criteria || {};
    const page = options.page || 0;
    const limit = options.limit || 30;
    return this.find(criteria)
      .populate('user', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * page)
      .exec();
  }
};

mongoose.model('Event', EventSchema);
