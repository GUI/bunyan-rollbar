'use strict';

var _ = require('lodash'),
    bunyan = require('bunyan');

var levelMapping = {};
levelMapping[bunyan.TRACE] = 'debug';
levelMapping[bunyan.DEBUG] = 'debug';
levelMapping[bunyan.INFO] = 'info';
levelMapping[bunyan.WARN] = 'warning';
levelMapping[bunyan.ERROR] = 'error';
levelMapping[bunyan.FATAL] = 'critical';

var BunyanRollbar = function() {
  this.initialize.apply(this, arguments);
};

_.extend(BunyanRollbar.prototype, {
  initialize: function(options) {
    options = options || {};
    if(options.rollbar) {
      this.rollbar = options.rollbar;
    } else {
      this.rollbar = require('rollbar');
      this.rollbar.init(options.rollbarToken, options.rollbarOptions);
    }
  },

  write: function(record) {
    if(!_.isObject(record)) {
      throw new Error('bunyan-rollbar requires a raw stream. Please define the type as raw when setting up the bunyan-rollbar stream.');
    }

    // If Bunyan has serialized the Error object, try to retrieve the real
    // error object to send to Rollbar, so it can process the error object
    // itself. This requires use of the customized
    // bunyanRollbar.stdSerializers.
    var error;
    if(record.err && record.err._bunyanRollbarOriginalObject && (record.err._bunyanRollbarOriginalObject instanceof Error)) {
      error = record.err._bunyanRollbarOriginalObject;
    } else if(record.err && (record.err instanceof Error)) {
      error = record.err;
    }

    // Similar to above, but for the request object. Try to retrieve the real
    // request object to send to Rollbar.
    var request;
    if(record.req && record.req._bunyanRollbarOriginalObject && record.req._bunyanRollbarOriginalObject.connection) {
      request = record.req._bunyanRollbarOriginalObject;
    } else if(record.req && record.req.connection) {
      request = record.req;
    }

    var payload = {
      level: levelMapping[record.level] || 'error',
      custom: record,
    };

    // If we're sending Rollbar the real error or request objects, remove those
    // references from the custom playload so there's not duplicate data.
    if(error) {
      payload.custom = _.omit(payload.custom, 'err');
    }
    if(request) {
      payload.custom = _.omit(payload.custom, 'req');
    }

    // Rollbar expects errors and general messages to be passed differently.
    if(error) {
      this.rollbar.handleErrorWithPayloadData(error, payload, request);
    } else {
      payload.custom = _.omit(payload.custom, 'msg');
      this.rollbar.reportMessageWithPayloadData(record.msg, payload, request);
    }
  },
});

// Define our own copy of the bunyan.stdSerializers but patch the 'err' and
// 'req' serializers so we can maintain access to the original error or request
// objects for sending to Rollbar (since Rollbar's API has it's own custom
// handling of those two types of objects).
var serializers = _.clone(bunyan.stdSerializers);
['err', 'req'].forEach(function(serializer) {
  var originalSerializer = bunyan.stdSerializers[serializer];
  serializers[serializer] = function(object) {
    // Call the original serializer.
    var serialized = originalSerializer(object);

    // If the original serializer did serialize this object, store the original
    // object on a special '_bunyanRollbarOriginalObject' property of the
    // serialized object. Using defineProperty should ensure that this object
    // is available for us to access, but won't show up in the JSON
    // serialization of the serialized data.
    if(serialized !== object && _.isPlainObject(serialized)) {
      Object.defineProperty(serialized, '_bunyanRollbarOriginalObject', {
        value: object,
      });
    }

    return serialized;
  };
});

module.exports.stdSerializers = serializers;
module.exports.Stream = BunyanRollbar;
