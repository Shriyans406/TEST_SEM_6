'use strict';

const tripcore = require('trip.core');

class CPlaneTestModel extends tripcore.Model {

  constructor() {
    super();
    this.mouseMoveX = '';
    this.mouseMoveY = '';
    this.mouseMoveZ = '';
    this.clickX = '';
    this.clickY = '';
    this.clickZ = '';
  }

  setMouseMove(coordinate) {
    this.mouseMoveX = coordinate.x;
    this.mouseMoveY = coordinate.y;
    this.mouseMoveZ = coordinate.z;
    this.emitChange();
  }

  setClick(coordinate) {
    this.clickX = coordinate.x;
    this.clickY = coordinate.y;
    this.clickZ = coordinate.z;
    this.emitChange();
  }


}

module.exports = CPlaneTestModel;
