'use strict';

const lib = require('../../../../..');
const THREE = lib.THREE;
const View = lib.View;

class Rectangle extends View {

  constructor(model, scene, options) {
    super(model, scene);

    options = options || {};
    this.label = options.label;
    options.color = (options.color === undefined) ?
      0x6666ff : options.color;
    options.position = (options.position === undefined) ?
      {x: 0, y: 0, z: 0} : options.position;
    this.options = options;
  }

  render() {
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0, 0));
    geometry.vertices.push(new THREE.Vector3(1, 0, 0));
    geometry.vertices.push(new THREE.Vector3(1, 1, 0));
    geometry.vertices.push(new THREE.Vector3(0, 1, 0));
    geometry.faces.push(new THREE.Face3(0,1,2));
    geometry.faces.push(new THREE.Face3(0,2,3));
    geometry.computeFaceNormals();

    var material = new THREE.MeshLambertMaterial({
      color: this.options.color,
      side: THREE.DoubleSide,
    });
    material.depthWrite = false;
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.options.position);
    this.sceneObject.add(mesh);
  }

}

module.exports = Rectangle;
