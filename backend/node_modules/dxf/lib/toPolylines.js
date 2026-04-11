"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _vecks = require("vecks");
var _colors = _interopRequireDefault(require("./util/colors"));
var _denormalise = _interopRequireDefault(require("./denormalise"));
var _entityToPolyline = _interopRequireDefault(require("./entityToPolyline"));
var _applyTransforms = _interopRequireDefault(require("./applyTransforms"));
var _logger = _interopRequireDefault(require("./util/logger"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
var _default = exports["default"] = function _default(parsed) {
  var entities = (0, _denormalise["default"])(parsed);
  var polylines = entities.map(function (entity) {
    var layerTable = parsed.tables.layers[entity.layer];
    var colorNumber = 0;
    if ('colorNumber' in entity) {
      colorNumber = entity.colorNumber;
    } else if (layerTable) {
      colorNumber = layerTable.colorNumber;
    }
    if (_colors["default"][colorNumber] === undefined) {
      _logger["default"].warn('Color index', colorNumber, 'invalid, defaulting to black');
      colorNumber = 0;
    }
    return {
      rgb: _colors["default"][colorNumber],
      layer: layerTable,
      vertices: (0, _applyTransforms["default"])((0, _entityToPolyline["default"])(entity), entity.transforms)
    };
  });
  var bbox = new _vecks.Box2();
  polylines.forEach(function (polyline) {
    polyline.vertices.forEach(function (vertex) {
      bbox.expandByPoint({
        x: vertex[0],
        y: vertex[1]
      });
    });
  });
  return {
    bbox: bbox,
    polylines: polylines
  };
};