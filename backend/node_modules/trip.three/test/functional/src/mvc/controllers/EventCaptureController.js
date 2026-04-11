'use strict';

const tripcore = require('trip.core');
const tripdom = require('trip.dom');

const lib = require('../../../../..');

const EventCaptureModel = require('../models/EventCaptureModel');
const EventCaptureView = require('../views/EventCaptureView');
const CubeView = require('../views/CubeView');

class EventCaptureController extends tripcore.Controller {

  constructor() {
    super(new EventCaptureModel());

    var domScene = new tripdom.Scene('#dom');
    this.addView(domScene, EventCaptureView);

    var options = {
      distance: 5,
      elevation: Math.PI/4,
      azimuth: -Math.PI/4,
    };
    var threeJSScene = new lib.Scene('#viewport', options);
    this.addView(threeJSScene, CubeView, {
      label: 'c1',
    });
    this.addView(threeJSScene, CubeView, {
      label: 'c2',
      color: 0xff6666,
      position: {x: 0.6, y: 0, z: 0},
      size: 0.2
    });
  }

  threeJSViewClick(event, view, data) {
    this.model.addEvent('click:' + view.label, event, data);
  }

  threeJSViewMouseEnter(event, view, data) {
    this.model.addEvent('enter:' + view.label, event, data);
  }

  threeJSViewMouseLeave(event, view, data) {
    this.model.addEvent('leave:' + view.label, event, data);
  }

  threeJSViewMouseOver(event, view, data) {
    this.model.addEvent('over:' + view.label, event, data);
  }

}

module.exports = EventCaptureController;
