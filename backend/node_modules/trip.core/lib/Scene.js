'use strict';

const ee = require('event-emitter');

/**
 * A Scene is a container for views.
 */
class Scene {
  constructor(container) {
    ee(this);
    this.container = container;
  }
}

module.exports = Scene;
