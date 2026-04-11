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
      <input type="button" value="XY"><br>
      <input type="button" value="XY+1"><br>
      <input type="button" value="YZ"><br>
      <input type="button" value="YZ-5"><br>
      <input type="button" value="ZX"><br>
      <input type="button" value="SKEW"><br>
    `;
    this.toHtml(template, {});
  }

  update() {
    // do nothing
  }

  events() {
    return {
      'click [value="XY"]': 'XY',
      'click [value="XY+1"]': 'XY+1',
      'click [value="YZ"]': 'YZ',
      'click [value="YZ-5"]': 'YZ-5',
      'click [value="ZX"]': 'ZX',
      'click [value="SKEW"]': 'SKEW',
    };
  }

}

module.exports = CameraSelectView;
