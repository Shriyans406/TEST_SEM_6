'use strict';

var cloneDeep = require('lodash.clonedeep');
var joi = require('joi');

var Model = require('../Model');

// A generic model that also incorporates validation
// functions that prevent modification if values are
// illegal
class JoiModel extends Model {

  constructor(schema, struct) {
    super();
    if (schema._type !== 'object') {
      throw new Error('schema must have object type at root');
    }
    var error;
    if (error = joi.validate(struct, schema).error) {
      throw new Error(error);
    }

    struct = cloneDeep(struct);

    // Only checks on level deep due to current lack of Proxy
    // implementations in JS environments
    schema._inner.children.forEach(function(child) {
      var key = child.key;
      Object.defineProperty(this, key, {

        set: function(value) {
          var potentialNewStruct = cloneDeep(struct);
          potentialNewStruct[key] = value;
          if (error = joi.validate(potentialNewStruct, schema).error) {
            throw new Error(error);
          }

          struct = potentialNewStruct;
          this.emitChange(key, value);
        },

        get: function() {
          return struct[key];
        },

      });
    }, this);
  }
}

module.exports = JoiModel;
