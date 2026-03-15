'use strict';

/**
 * Merge two option objects. Conflicting keys will
 * throw Errors, unless they are specified in 'concatenations',
 * which is aimed at string-based options
 */
module.exports = function(a, b, criteria) {
  criteria = criteria || {};
  let concatenations = criteria.concatenations || [];

  let result = {};
  concatenations.forEach((key) => {
    if (a[key] && b[key]) {
      result[key] = a[key] + ' ' + b[key];
    } else if (a[key]) {
      result[key] = a[key];
    } else if (b[key]) {
      result[key] = b[key];
    }
  });

  for (let key in a) {
    if (a.hasOwnProperty(key) && concatenations.indexOf(key) === -1) {
      if (b.hasOwnProperty(key) && (b[key] !== a[key])) {
        throw new Error('option merge conflict: ' + key);
      }
      result[key] = a[key];
    }
  }

  for (let key in b) {
    if (b.hasOwnProperty(key) && concatenations.indexOf(key) === -1) {
      if (a.hasOwnProperty(key) && (a[key] !== b[key])) {
        throw new Error('option merge conflict: ' + key);
      }
      result[key] = b[key];
    }
  }
  return result;
};
