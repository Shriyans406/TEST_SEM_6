'use strict';

const tripcore = require('trip.core');
const tripdom = require('trip.dom');
const $ = tripdom.$;

const lib = require('../../../../..');

var CubeView = require('../views/CubeView');
var AxesView = require('../views/AxesView');
var CameraSelectView = require('../views/CameraSelectView');

class CamerasController extends tripcore.Controller {

  constructor() {
    super(new tripcore.Model());

    var domScene = new tripdom.Scene('#dom');
    this.addView(domScene, CameraSelectView, {showZoom: true});

    var options = {
      distance: 10,
      azimuth: Math.PI/4,
      elevation: 1.08,
      layers: 2,
      clear: false,
    };
    var scene = new lib.Scene('#viewport', options);
    this.addView(scene, CubeView, {
      color: 0xff0000,
      position: {x: 0, y: 0, z: 2.5},
      layer: 1,
    });
    this.addView(scene, CubeView, {
      color: 0x0000ff,
      position: {x: 2.5, y: 0, z: 0},
    });
    this.addView(scene, CubeView, {
      color: 0x6699ff,
      position: {x: -2.5, y: 0, z: 0},
    });
    this.addView(scene, CubeView, {
      color: 0x00ff00,
      position: {x: 0, y: 2.5, z: 0},
      name: 'green',
    });
    this.addView(scene, AxesView, {
      length: 5,
      name: 'axes',
    });
    this.scene = scene;
  }

  perspective() {
    this.scene.setPerspective();
  }

  'x+'() {
    this.scene.setOrthoXPos();
  }

  'x-'() {
    this.scene.setOrthoXNeg();
  }

  'y+'() {
    this.scene.setOrthoYPos();
  }

  'y-'() {
    this.scene.setOrthoYNeg();
  }

  'z+'() {
    this.scene.setOrthoZPos();
  }

  'z-'() {
    this.scene.setOrthoZNeg();
  }

  zoomToExtents() {
    let filters = {
      node: (node) => {
        return node.position.z > 10;
      },
    };
    this.scene.zoomToExtents(filters);
  }

  zoomToLayer1() {
    let filters = {
      layer: (index) => {
        return index === 1;
      },
    };
    this.scene.zoomToExtents(filters);
  }

  zoomToGreenCube() {
    let filters = {
      view: (view) => {
        return view.sceneObject.name === 'green';
      },
    };
    this.scene.zoomToExtents(filters);
  }

}

module.exports = CamerasController;
