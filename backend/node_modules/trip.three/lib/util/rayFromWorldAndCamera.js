'use strict';

const THREE = require('three');

// https://github.com/mrdoob/three.js/blob/master/src/core/Raycaster.js
module.exports = function(worldPos, camera) {
  let ray = new THREE.Ray();
  if (camera instanceof THREE.PerspectiveCamera) {
    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    ray.direction.copy(worldPos.clone().sub(ray.origin).normalize());
  } else if (camera instanceof THREE.OrthographicCamera) {
    // Ortho view seems to require the origin to be before
    // the objects wanting to ray select
    ray.direction.set(0, 0, -1).transformDirection(camera.matrixWorld);
    ray.origin.copy(new THREE.Vector3().addVectors(
      worldPos, ray.direction.clone().negate().multiplyScalar(camera.far)));
  } else {
    console.error('rayFromWorldAndCamera: Unsupported camera type.');
  }
  return ray;
};
