'use strict';

const chai = require('chai');
const assert = chai.assert;

const trip = require('../..');

// ----- Basic MVC -----

class Model extends trip.Model {
  set(key, value) {
    this.emitChange(key, value);
  }
}

// Array-based view container
class Scene extends trip.Scene {
  constructor() {
    super([]);
  }
}

/**
 * Controller mixin relays interactions on the view (e.g. clicks)
 * to the owning controller (which is 'this'). See trip.DOM for a
 * more intuitive example.
 */
function ViewControllerMixin(view) {
  view.on('click', () => {
    this.onClick(view.id);
  });
}

class View extends trip.View {
  constructor(model, scene,options) {
    super(model, scene, options);
    this.id = options.id;
    this.controllerMixin = ViewControllerMixin;
    this.events = [];
  }
  render() {
    this.events.push(this.id + ':render');
  }
  update(key, value) {
    this.events.push(this.id + ':update:' + key + ':' + value);
  }
  simulateClick() {
    this.emit('click');
  }
}

class Controller extends trip.Controller {
  constructor() {
    super(new Model());
    let scene = new Scene();
    this.v1 = this.addView(scene, View, {id: 1});
    this.v2 = this.addView(scene, View, {id: 2});
    // Capture simulated clicks
    this.clicks = [];
  }
  simulateModelChange(key, value) {
    this.model.set(key, value);
  }
  onClick(id) {
    this.clicks.push(id);
  }
}

// ----- Tests -----

describe('MVC', () => {

  it('wiring between components', function(done) {
    const ctrl = new Controller();

    setTimeout(() => {
      // First render is done on next tick.
      assert.deepEqual(ctrl.v1.events, ['1:render']);
      assert.deepEqual(ctrl.v2.events, ['2:render']);

      // Simulate a model change - model should emit arguments
      // and view updates are triggered
      ctrl.model.on('change', (k, v) => {
        assert.equal(k, 'a');
        assert.equal(v, 7);
      });
      ctrl.simulateModelChange('a', 7);
      assert.deepEqual(ctrl.v1.events, ['1:render', '1:update:a:7']);
      assert.deepEqual(ctrl.v2.events, ['2:render', '2:update:a:7']);

      // Simulate a user interaction - triggers controller
      assert.deepEqual(ctrl.clicks, []);
      ctrl.v1.simulateClick();
      assert.deepEqual(ctrl.clicks, [1]);
      ctrl.v2.simulateClick();
      assert.deepEqual(ctrl.clicks, [1, 2]);

      done();
    }, 0);
  });

});
