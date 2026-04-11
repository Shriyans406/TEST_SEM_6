'use strict';

const ee = require('event-emitter');

class View {

  constructor(model, scene) {
    this.model = model;
    this.scene = scene;
    ee(this);

    // Respond to model 'change' events by triggering an 'update'
    // event
    const _this = this;
    // 'arguments' doesn't work with arrow function here, so use classic function()
    this.changeFn = function() {
      _this.emit('pre_update');
      _this.update.apply(_this, arguments);
      _this.emit('post_update');
    };

    // Render on next tick to ensure view
    // construction is complete
    setTimeout(() => {
      _this.emit('pre_render');
      _this.render();
      _this.emit('post_render');

      // It can happen that a change event is fired before the
      // next tick, so only start responding to changes after
      // we are satisfied render() has been called
      model.on('change', this.changeFn);
    }, 0);
  }

  remove() {
    this.model.off('change', this.changeFn);
  }

}

module.exports = View;
