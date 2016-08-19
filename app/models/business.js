'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const notify = require('../mailer');
const multer = require('multer');
const AWS = require('aws-sdk');

console.log(__dirname);

// AWS.config.loadFromPath('../tahoeontap/config/s3_config.json');
// AWS.config.key = process.env.IMAGER_S3_KEY;
// AWS.config.secret = process.env.IMAGER_S3_SECRET;
AWS.config.update({accessKeyId: 'AKIAJKG74V2F5CH3ZEQQ', secretAccessKey: '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'});

const s3Bucket = new AWS.S3({params: {Bucket: 'myBucket'}});
// const Imager = require('imager');
// const config = require('../../config/config');
// const imagerConfig = require(config.root + '/config/imager.js');

const Schema = mongoose.Schema;

const getTags = tags => tags.join(',');
const setTags = tags => tags.split(',');

/**
 * Business Schema
 */

const BusinessSchema = new Schema({
  title: { type : String, default : '', trim : true },
  body: { type : String, default : '', trim : true },
  user: { type : Schema.ObjectId, ref : 'User' },
  comments: [{
    body: { type : String, default : '' },
    user: { type : Schema.ObjectId, ref : 'User' },
    createdAt: { type : Date, default : Date.now }
  }],
  tags: { type: [], get: getTags, set: setTags },
  image: {
    cdnUri: String,
    files: []
  },
  createdAt  : { type : Date, default : Date.now }
});

/**
 * Validations
 */

BusinessSchema.path('title').required(true, 'Business title cannot be blank');
BusinessSchema.path('body').required(true, 'Business body cannot be blank');

/**
 * Pre-remove hook
 */

BusinessSchema.pre('remove', function (next) {
  // const imager = new Imager(imagerConfig, 'S3');
  // const files = this.image.files;

  // if there are files associated with the item, remove from the cloud too
  // imager.remove(files, function (err) {
  //   if (err) return next(err);
  // }, 'business');

  next();
});

/**
 * Methods
 */

BusinessSchema.methods = {

  /**
   * Save business and upload image
   *
   * @param {Object} images
   * @api private
   */

  uploadAndSave: function (images) {
    const err = this.validateSync();
    if (err && err.toString()) throw new Error(err.toString());
    
    console.log('=======> buffer:', images[0].buffer);


        // buf = new Buffer(req.body.imageBinary.replace(/^data:image\/\w+;base64,/, ""),'base64')
        var data = {
          Key: 'image', 
          Body: images[0].buffer,
          ContentEncoding: 'base64',
          ContentType: 'image/jpeg'
        };

        var that = this;
        var promise = new Promise(function(resolve, reject) {
          console.log('in the promise!');

            return s3Bucket.putObject(data, function(err, data){
                if (err) { 
                  console.log(err);
                  console.log('Error uploading data: ', data);
                  resolve(that.save());
                } else {
                  console.log('succesfully uploaded the image!');
                  resolve(that.save());
                }
            });
          
          resolve('happy days');
          reject('uh oh');
        });

        return promise;


    /*
    if (images && !images.length) return this.save();
    const imager = new Imager(imagerConfig, 'S3');

    imager.upload(images, function (err, cdnUri, files) {
      if (err) return cb(err);
      if (files.length) {
        self.image = { cdnUri : cdnUri, files : files };
      }
      self.save(cb);
    }, 'business');
    */
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
      business: this,
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

BusinessSchema.statics = {

  /**
   * Find business by id
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
   * List businesses
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

mongoose.model('Business', BusinessSchema);
