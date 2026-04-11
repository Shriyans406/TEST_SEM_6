'use strict';

const ee = require('event-emitter');

class Controller {

  constructor(model) {
    ee(this);
    this.model = model;
    this.views = [];
  }

  addView(scene, ViewConstructor, options) {
    const view = new ViewConstructor(this.model, scene, options);
    view.on('post_render', () => {
      view.controllerMixin.call(this, view);
    });
    this.views.push(view);
    return view;
  }

  removeView(view) {
    const index = this.views.indexOf(view);
    if (index === -1) {
      throw new Error('view to remove does not exist in controller');
    }
    view.remove();
    this.views.splice(index, 1);
  }

  removeViews() {
    const views = this.views.slice();
    views.forEach(view => {
      this.removeView(view);
    });
    this.views = [];
  }
}

module.exports = Controller;
