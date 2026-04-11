"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.process = exports["default"] = exports.TYPE = void 0;
var _common = _interopRequireDefault(require("./common"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var TYPE = exports.TYPE = 'OLE2FRAME';
var process = exports.process = function process(tuples) {
  return tuples.reduce(function (entity, tuple) {
    var type = tuple[0];
    var value = tuple[1];
    switch (type) {
      case 70:
        entity.version = value;
        break;
      case 3:
        entity.name = value;
        break;
      case 10:
        entity.upperLeftX = value;
        break;
      case 20:
        entity.upperLeftY = value;
        break;
      case 30:
        entity.upperLeftZ = value;
        break;
      case 11:
        entity.lowerRightX = value;
        break;
      case 21:
        entity.lowerRightY = value;
        break;
      case 31:
        entity.lowerRightZ = value;
        break;
      case 71:
        // 1 = Link; 2 = Embedded; 3 = Static
        entity.objectType = value;
        break;
      case 72:
        // 0 = Object resides in model space, 1 = Object resides in paper space
        entity.tile = value;
        break;
      case 90:
        entity.length = value;
        break;
      case 310:
        entity.data += value;
        break;
      default:
        Object.assign(entity, (0, _common["default"])(type, value));
        break;
    }
    return entity;
  }, {
    type: TYPE,
    data: ''
  });
};
var _default = exports["default"] = {
  TYPE: TYPE,
  process: process
};