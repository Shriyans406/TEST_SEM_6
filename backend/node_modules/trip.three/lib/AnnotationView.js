'use strict';

const THREE = require('three');
const tripdom = require('trip.dom');

const toScreenPosition = require('./util/toScreenPosition');

class AnnotationView extends tripdom.View {

  constructor(model, scene, position, options) {
    options = options || {};
    if (options.class) {
      options.class += ' annotation';
    } else {
      options.class = 'annotation';
    }
    options.style = 'position: absolute;';
    super(model, scene, options);
    this.position = new THREE.Vector3(position.x, position.y, position.z);
    this.container = scene.container;
    this.align = options.align || {};

    this.onRender = (camera) => {
      this.updatePosition(camera);
    };

    scene.on('render', this.onRender);
    // setTimeout(this.updatePosition.bind(this, scene.camera));
  }

  remove() {
    super.remove();
    this.scene.off('render', this.onRender);
  }

  render() {
    super.render();
  }

  updatePosition(camera) {
    var coords = toScreenPosition(
      this.scene.width,
      this.scene.height,
      camera,
      this.position);
    var width = this.$el.outerWidth();
    var height = this.$el.outerHeight();
    var offsetX = 0;
    var offsetY = 0;
    if (this.align.centerX) {
      offsetX = -width/2;
    }
    if (this.align.centerY) {
      offsetY = -height/2;
    }
    if (this.align.right) {
      offsetX = -width;
    }
    if (this.align.bottom) {
      offsetY = -height;
    }
    this.$el.css({
      left: coords.x + offsetX + 'px',
      top: coords.y + offsetY + 'px',
    });
  }

}

module.exports = AnnotationView;
