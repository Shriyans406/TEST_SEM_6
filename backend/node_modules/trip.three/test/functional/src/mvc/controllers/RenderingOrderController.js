'use strict';

const trip = require('trip.core');
const $ = require('trip.dom').$;
const Controller = trip.Controller;
const Model = trip.Model;

const lib = require('../../../../..');
const Scene = lib.Scene;

const RectangleView = require('../views/RectangleView');

class RenderingOrderController extends Controller {

  constructor() {
    super(new Model());

    var options = {
      distance: 10,
      azimuth: Math.PI/4,
      elevation: 1.08,
    };
    var scene = new Scene('#viewport', options);

    this.addView(scene, RectangleView,
      {
        position: {
          x: 0.0,
          y: 0.0,
          z: 0,
        },
        color: 0x0000ff,
      });
    this.addView(scene, RectangleView,
      {
        position: {
          x: 0.5,
          y: 0.5,
          z: 0,
        },
        color: 0x00ff00,
      });
    this.addView(scene, RectangleView,
      {
        position: {
          x: 0.75,
          y: 0.75,
          z: 0,
        },
        color: 0xff0000,
      });
  }

}

module.exports = RenderingOrderController;
