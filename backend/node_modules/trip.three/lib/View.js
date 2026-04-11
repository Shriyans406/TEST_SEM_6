'use strict';

const tripcore = require('trip.core');
const THREE = require('three');

const ControllerMixin = require('./ControllerMixin');
let idcounter = 1;

class View extends tripcore.View {

  constructor(model, scene, options) {
    super(model, scene, options);
    options = options || {};

    this.id = '3v_' + (idcounter++);
    this.sceneObject = new THREE.Object3D();
    this.sceneObject.name = options.name || '';
    this.layer = options.layer || 0;
    scene.addView(this);
    this.controllerMixin = ControllerMixin;

    var _this = this;

    function RelayListener(type) {
      var listener = function listener(event, closest) {
        if (closest.view === _this) {
          event.viewClicked = true;
          _this.emit(type, event, closest.position);
        }
      };
      this.remove = function () {
        _this.off(type, listener);
      };
      scene.viewEventGenerator.on(type, listener);
    }

    // Relay the events via the view
    this.eventListeners = [];
    this.eventListeners.push(new RelayListener('click'));
    this.eventListeners.push(new RelayListener('mouseenter'));
    this.eventListeners.push(new RelayListener('mouseover'));
    this.eventListeners.push(new RelayListener('mouseleave'));
  }

  remove() {
    super.remove();
    if (!this.hidden) {
      this.scene.removeView(this);
    }
    // subsequent operations on the scene object should result in an error
    this.sceneObject = undefined;
    this.scene.redraw();

    this.eventListeners.forEach(function (listener) {
      listener.remove();
    });
    this.eventListeners = [];
  }

  render() {
    this.clear();
    this.scene.redraw();
  }

  update() {
    this.scene.redraw();
  }

  clear() {
    var children = this.sceneObject.children.slice(0);
    children.forEach(function (child) {
      this.sceneObject.remove(child);
    }, this);
  }

  hide() {
    if (this.hidden) {
      console.warn('view is already hidden');
      return;
    }
    this.scene.removeView(this);
    this.hidden = true;
    this.scene.redraw();
  }

  show() {
    if (!this.hidden) {
      console.warn('view is already shown');
      return;
    }
    this.scene.addView(this);
    this.hidden = false;
    this.scene.redraw();
  }

}

module.exports = View;
