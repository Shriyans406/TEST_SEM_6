'use strict';

const lib = require('../../../../..');
const THREE = lib.THREE;
const View = lib.View;

class CubeView extends View {

  constructor(model, scene, options) {
    options = options || {};
    options.layer = 1;
    super(model, scene, options);

    this.label = options.label;
    this.color = options.color;
    this.field = options.field;
  }

  render() {
    var mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.05),
      new THREE.MeshLambertMaterial({color: this.color}));
    this.sceneObject.add(mesh);
  }

  update() {
    this.sceneObject.position.set(
      this.model[this.field + 'X'],
      this.model[this.field + 'Y'],
      this.model[this.field + 'Z']);
  }

}

module.exports = CubeView;
