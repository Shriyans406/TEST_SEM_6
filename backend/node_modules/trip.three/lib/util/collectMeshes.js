'use strict';

const THREE = require('three');

module.exports = function(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      meshes.push(obj);
    }
  });
  return meshes;
};
