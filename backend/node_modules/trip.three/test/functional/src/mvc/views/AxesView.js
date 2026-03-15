'use strict';

const lib = require('../../../../..');
const THREE = lib.THREE;
const View = lib.View;

class AxesView extends View {

  constructor(model, scene, options) {
    options = options || {};
    super(model, scene, options);
    this.length = options.length || 1000;
  }

  render() {
    const axes = [
      new THREE.Geometry(),
      new THREE.Geometry(),
      new THREE.Geometry(),
      new THREE.Geometry(),
      new THREE.Geometry(),
      new THREE.Geometry(),
    ];

    const length = this.length;
    axes[0].vertices.push(new THREE.Vector3(0, 0, 0));
    axes[0].vertices.push(new THREE.Vector3(length, 0, 0));
    axes[1].vertices.push(new THREE.Vector3(0, 0, 0));
    axes[1].vertices.push(new THREE.Vector3(0, length, 0));
    axes[2].vertices.push(new THREE.Vector3(0, 0, 0));
    axes[2].vertices.push(new THREE.Vector3(0, 0, length));
    axes[3].vertices.push(new THREE.Vector3(0, 0, 0));
    axes[3].vertices.push(new THREE.Vector3(-length, 0, 0));
    axes[4].vertices.push(new THREE.Vector3(0, 0, 0));
    axes[4].vertices.push(new THREE.Vector3(0, -length, 0));
    axes[5].vertices.push(new THREE.Vector3(0, 0, 0));
    axes[5].vertices.push(new THREE.Vector3(0, 0, -length));

    this.sceneObject.add(new THREE.Line(axes[0], new THREE.LineBasicMaterial({ color: 0x0000ff })));
    this.sceneObject.add(new THREE.Line(axes[1], new THREE.LineBasicMaterial({ color: 0x00ff00 })));
    this.sceneObject.add(new THREE.Line(axes[2], new THREE.LineBasicMaterial({ color: 0xff0000 })));
    this.sceneObject.add(new THREE.Line(axes[3], new THREE.LineBasicMaterial({ color: 0xaaaaaa })));
    this.sceneObject.add(new THREE.Line(axes[4], new THREE.LineBasicMaterial({ color: 0xaaaaaa })));
    this.sceneObject.add(new THREE.Line(axes[5], new THREE.LineBasicMaterial({ color: 0xaaaaaa })));
  }

}

module.exports = AxesView;
