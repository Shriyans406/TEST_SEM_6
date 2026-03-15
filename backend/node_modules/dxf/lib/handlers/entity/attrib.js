"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.process = exports["default"] = exports.TYPE = void 0;
var _attdef = require("./attdef");
var TYPE = exports.TYPE = 'ATTRIB';
var process = exports.process = function process(tuples) {
  return tuples.reduce(function (entity, tuple) {
    var type = tuple[0];
    var value = tuple[1];
    (0, _attdef.assign)(entity, type, value);
    return entity;
  }, {
    type: TYPE,
    subclassMarker: 'AcDbText',
    thickness: 0,
    scaleX: 1,
    mtext: {},
    text: {}
  });
};
var _default = exports["default"] = {
  TYPE: TYPE,
  process: process
};