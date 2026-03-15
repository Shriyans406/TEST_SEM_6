"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _vecks = require("vecks");
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * Transform the bounding box and the SVG element by the given
 * transforms. The <g> element are created in reverse transform
 * order and the bounding box in the given order.
 */
var _default = exports["default"] = function _default(bbox, element, transforms) {
  var transformedElement = '';
  var matrices = transforms.map(function (transform) {
    // Create the transformation matrix
    var tx = transform.x || 0;
    var ty = transform.y || 0;
    var sx = transform.scaleX || 1;
    var sy = transform.scaleY || 1;
    var angle = (transform.rotation || 0) / 180 * Math.PI;
    var cos = Math.cos,
      sin = Math.sin;
    var a, b, c, d, e, f;
    // In DXF an extrusionZ value of -1 denote a tranform around the Y axis.
    if (transform.extrusionZ === -1) {
      a = -sx * cos(angle);
      b = sx * sin(angle);
      c = sy * sin(angle);
      d = sy * cos(angle);
      e = -tx;
      f = ty;
    } else {
      a = sx * cos(angle);
      b = sx * sin(angle);
      c = -sy * sin(angle);
      d = sy * cos(angle);
      e = tx;
      f = ty;
    }
    return [a, b, c, d, e, f];
  });

  // Only transform the bounding box is it is valid (i.e. not Infinity)
  var transformedBBox = new _vecks.Box2();
  if (bbox.valid) {
    var bboxPoints = [{
      x: bbox.min.x,
      y: bbox.min.y
    }, {
      x: bbox.max.x,
      y: bbox.min.y
    }, {
      x: bbox.max.x,
      y: bbox.max.y
    }, {
      x: bbox.min.x,
      y: bbox.max.y
    }];
    matrices.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 6),
        a = _ref2[0],
        b = _ref2[1],
        c = _ref2[2],
        d = _ref2[3],
        e = _ref2[4],
        f = _ref2[5];
      bboxPoints = bboxPoints.map(function (point) {
        return {
          x: point.x * a + point.y * c + e,
          y: point.x * b + point.y * d + f
        };
      });
    });
    transformedBBox = bboxPoints.reduce(function (acc, point) {
      return acc.expandByPoint(point);
    }, new _vecks.Box2());
  }
  matrices.reverse();
  matrices.forEach(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 6),
      a = _ref4[0],
      b = _ref4[1],
      c = _ref4[2],
      d = _ref4[3],
      e = _ref4[4],
      f = _ref4[5];
    transformedElement += "<g transform=\"matrix(".concat(a, " ").concat(b, " ").concat(c, " ").concat(d, " ").concat(e, " ").concat(f, ")\">");
  });
  transformedElement += element;
  matrices.forEach(function (transform) {
    transformedElement += '</g>';
  });
  return {
    bbox: transformedBBox,
    element: transformedElement
  };
};