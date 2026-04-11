'use strict';

const THREE = require('three');

const rayFromWorldAndCamera = require('./rayFromWorldAndCamera');

module.exports = function(worldPos, origin, normal, camera) {
  const ray = rayFromWorldAndCamera(worldPos, camera);

  // http://en.wikipedia.org/wiki/Line-plane_intersection
  const p0 = origin;
  const l0 = ray.origin;
  const l = ray.direction;
  const n = normal;

  const num = new THREE.Vector3().subVectors(p0, l0).dot(n);
  const den = l.dot(n);
  if (Math.abs(num) < 1e-6) {
    // In plane
    return worldPos.clone();
  } else if (Math.abs(den) < 1e-6) {
    return undefined;
  } else {
    const d = num/den;
    return new THREE.Vector3().addVectors(l0, l.clone().multiplyScalar(d));
  }
};
