'use strict';

const tripdom = require('trip.dom');

class CameraSelectView extends tripdom.View {

  constructor(model, scene, options) {
    options = options || {};
    super(model, scene, options);
    this.showZoom = options.showZoom;
  }

  render() {
    super.render();
    let template = `
      <input type="button" value="perspective"><br>
      <input type="button" value="x+"><input type="button" value="x-"><br>
      <input type="button" value="y+"><input type="button" value="y-"><br>
      <input type="button" value="z+"><input type="button" value="z-"><br>
    `;
    if (this.showZoom) {
      template +=
        `<input type="button" value="zoom to extents"><br>
        <input type="button" value="zoom to layer 1"><br>
        <input type="button" value="zoom to green"><br>
        `;
    }
    this.toHtml(template, {});
  }

  update() {
    // do nothing
  }

  events() {
    return {
      'click [value="perspective"]': 'perspective',
      'click [value="x+"]': 'x+',
      'click [value="x-"]': 'x-',
      'click [value="y+"]': 'y+',
      'click [value="y-"]': 'y-',
      'click [value="z+"]': 'z+',
      'click [value="z-"]': 'z-',
      'click [value="zoom to extents"]': 'zoomToExtents',
      'click [value="zoom to layer 1"]': 'zoomToLayer1',
      'click [value="zoom to green"]': 'zoomToGreenCube',
    };
  }

}

module.exports = CameraSelectView;
