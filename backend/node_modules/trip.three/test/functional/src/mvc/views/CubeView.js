'use strict';

const lib = require('../../../../..');
const THREE = lib.THREE;
const View = lib.View;

class CubeView extends View {

  constructor(model, scene, options) {
    super(model, scene, options);

    options = options || {};
    this.label = options.label;
    options.color = (options.color === undefined) ?
      0x6666ff : options.color;
    options.position = (options.position === undefined) ?
      {x: 0, y: 0, z: 0} : options.position;
    options.size = (options.size === undefined) ?
      1 : options.size;
    this.options = options;


  }

  render() {
    var size = this.options.size;
    var mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size,size,size),
      new THREE.MeshLambertMaterial({color: this.options.color}));
    this.sceneObject.position.copy(this.options.position);
    this.sceneObject.add(mesh);

    this.vertices = [
      new THREE.Vector3(-size/2, -size/2, -size/2),
      new THREE.Vector3(size/2, -size/2, -size/2),
      new THREE.Vector3(size/2, size/2, -size/2),
      new THREE.Vector3(-size/2, size/2, -size/2),
      new THREE.Vector3(-size/2, -size/2, size/2),
      new THREE.Vector3(size/2, -size/2, size/2),
      new THREE.Vector3(size/2, size/2, size/2),
      new THREE.Vector3(-size/2, size/2, size/2),
    ].map((p) => {
      return new THREE.Vector3().addVectors(p, this.sceneObject.position);
    });

    this.edges = [
      [this.vertices[0], this.vertices[1]],
      [this.vertices[1], this.vertices[2]],
      [this.vertices[2], this.vertices[3]],
      [this.vertices[3], this.vertices[0]],
      [this.vertices[4], this.vertices[5]],
      [this.vertices[5], this.vertices[6]],
      [this.vertices[6], this.vertices[7]],
      [this.vertices[7], this.vertices[4]],
      [this.vertices[0], this.vertices[4]],
      [this.vertices[1], this.vertices[5]],
      [this.vertices[2], this.vertices[6]],
      [this.vertices[3], this.vertices[7]],
    ];
  }

}

module.exports = CubeView;
