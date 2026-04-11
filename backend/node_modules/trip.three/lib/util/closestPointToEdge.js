'use strict';

const THREE = require('three');
const rayFromWorldAndCamera = require('./rayFromWorldAndCamera');

module.exports = function(worldPos, edge, camera) {
  const ray = rayFromWorldAndCamera(worldPos, camera);

  const from = edge[0];
  const direction = new THREE.Vector3().subVectors(edge[1], edge[0]);

  // http://softsurfer.com/Archive/algorithm_0106/algorithm_0106.htm
  const u = direction.clone().normalize();
  const v = ray.direction;

  const w0 = new THREE.Vector3().subVectors(from, ray.origin);
  const a = u.dot(u);
  const b = u.dot(v);
  const c = v.dot(v);
  const d = u.dot(w0);
  const e = v.dot(w0);

  const sc = (b*e - c*d)/(a*c - b*b);
  // const tc = (a*e - b*d)/(a*c - b*b);

  const psc = new THREE.Vector3().addVectors(from, u.clone().multiplyScalar(sc));
  // const qtc = new THREE.Vector3().addVectors(mouseRay.origin, v.clone().multiplyScalar(tc));

  // Check if one the edge or outside by checking the distance to the endpoints
  // is less than the length of the edge
  const l = direction.length();
  if ((new THREE.Vector3().subVectors(psc, edge[0]).length() <= l) &&
      (new THREE.Vector3().subVectors(psc, edge[1]).length() <= l)) {
    return psc;
  } else {
    return null;
  }
};
