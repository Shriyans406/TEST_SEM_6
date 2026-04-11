'use strict';

const tripcore = require('trip.core');
const tripdom = require('trip.dom');
const $ = tripdom.$;

const lib = require('../../../../..');
const SnapController = lib.SnapController;

const SnapTestModel = require('../models/SnapTestModel');
const CubeView = require('../views/CubeView');
const CoordinateDOMView = require('../views/CoordinateDOMView');
const Coordinate3View = require('../views/Coordinate3View');
const CameraSelectView = require('../views/CameraSelectView');
const CPlaneSelectView = require('../views/CPlaneSelectView');

class SnapTestController extends tripcore.Controller {

  constructor() {
    super(new SnapTestModel());

    const domScene = new tripdom.Scene('#select');
    this.addView(domScene, CameraSelectView);
    this.addView(domScene, CPlaneSelectView);

    const valuesDOMScene = new tripdom.Scene('#values');
    const threeJSScene = new lib.Scene('#viewport', {
      distance: 5,
      elevation: Math.PI/4,
      azimuth: -Math.PI/4,
      near: 0.1,
      far: 100,
      layers: 2,
    });
    this.scene = threeJSScene;

    const viewFilterForSurfaceSnap = (view) => {
      return view.layer === 0;
    };
    const viewFilterForEdgeSnap = (view) => {
      return view.layer === 0;
    };
    const snapCtrl = new SnapController(
      threeJSScene,
      new tripdom.Scene($('#snap-controls')),
      {
        viewFilterForEdgeSnap: viewFilterForEdgeSnap,
        viewFilterForSurfaceSnap: viewFilterForSurfaceSnap,
        extents: 30,
      });
    snapCtrl.setXY();

    this.snapCtrl = snapCtrl;
    snapCtrl.on('mousemove', (event, position) => {
      this.model.setMouseMove(position);
    });
    snapCtrl.on('click', (event, position) => {
      this.model.setClick(position);
    });

    this.addView(threeJSScene, CubeView, {
      label: 'c1',
    });
    this.addView(threeJSScene, CubeView, {
      label: 'c2',
      color: 0xff6666,
      position: {x: 0.6, y: 0, z: 0},
      size: 0.2
    });

    this.addView(valuesDOMScene, CoordinateDOMView, {
      label: 'mousemove',
      field: 'mouseMove',
    });
    this.addView(valuesDOMScene, CoordinateDOMView, {
      label: 'click',
      field: 'click',
    });
    this.addView(threeJSScene, Coordinate3View, {
      color: 0xff0000,
      field: 'mouseMove',
    });
    this.addView(threeJSScene, Coordinate3View, {
      color: 0x00ff00,
      field: 'click',
    });
  }

  perspective() {
    this.scene.setPerspective();
    this.snapCtrl.setXY();
  }

  'x+'() {
    this.scene.setOrthoXPos();
    this.snapCtrl.setYZ();
  }

  'x-'() {
    this.scene.setOrthoXNeg();
    this.snapCtrl.setYZ();
  }

  'y+'() {
    this.scene.setOrthoYPos();
    this.snapCtrl.setZX();
  }

  'y-'() {
    this.scene.setOrthoYNeg();
    this.snapCtrl.setZX();
  }

  'z+'() {
    this.scene.setOrthoZPos();
    this.snapCtrl.setXY();
  }

  'z-'() {
    this.scene.setOrthoZNeg();
    this.snapCtrl.setXY();
  }

  'XY'() {
    this.snapCtrl.setXY();
  }

  'XY+1'() {
    this.snapCtrl.model.updateOriginAndOrientation({
      origin: {
        x: 0, y: 0, z: 1,
      },
      normal: {
        x: 0, y: 0, z: 1,
      },
      localX: {
        x: 1, y: 0, z: 0,
      }
    });
  }

  'YZ'() {
    this.snapCtrl.setYZ();
  }

  'YZ-5'() {
    this.snapCtrl.model.updateOriginAndOrientation({
      origin: {
        x: -5, y: 0, z: 0,
      },
      normal: {
        x: 1, y: 0, z: 0,
      },
      localX: {
        x: 0, y: 1, z: 0,
      }
    });
  }

  'ZX'() {
    this.snapCtrl.setZX();
  }

  'SKEW'() {
    this.snapCtrl.model.updateOriginAndOrientation({
      origin: {
        x: 1, y: 0, z: 5,
      },
      normal: {
        x: 1/Math.sqrt(2), y: 1/Math.sqrt(2), z: 0,
      },
      localX: {
        x: 0, y: 0, z: 1,
      }
    });
  }
}

module.exports = SnapTestController;
