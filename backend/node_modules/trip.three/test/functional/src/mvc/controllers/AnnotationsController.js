'use strict';

const trip = require('trip.core');
const tripdom = require('trip.dom');

const lib = require('../../../../..');
const Scene = lib.Scene;

const AxesView = require('../views/AxesView');
const CubeView = require('../views/CubeView');
const CornerAnnotationView = require('../views/CornerAnnotationView');

class AnnotationsController extends trip.Controller {

  constructor() {
    super(new trip.Model());

    var options = {
      distance: 5,
      elevation: Math.PI/4,
      azimuth: -Math.PI/4,
    };
    var scene = new Scene('#viewport', options);

    this.addView(scene, CubeView, {position: {x: 0.5, y: 0, z: 1.5}});
    this.addView(scene, CornerAnnotationView, {x: 0.0, y: 0.0, z: 0.0});
    this.addView(scene, CornerAnnotationView, {x: 1.0, y: 0.5, z: 1});
    this.addView(scene, CornerAnnotationView, {x: 0, y: -0.5, z: 2});
    this.addView(scene, AxesView);
  }

}

module.exports = AnnotationsController;
