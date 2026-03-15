'use strict';

const THREE = require('three');

const decimalAdjust = require('./decimalAdjust');

module.exports = function(width, height, camera, position) {
  const mouseX = (position.x/width)*2 - 1;
  const mouseY = -(position.y/height) * 2 + 1;

  if (camera instanceof THREE.PerspectiveCamera) {
    const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
    return vector.unproject(camera);
  } else if (camera instanceof THREE.OrthographicCamera) {
    const vector = new THREE.Vector3(mouseX, mouseY, -1);
    const worldPos = vector.unproject(camera);

    const q = camera.quaternion;

    const x = decimalAdjust(q.x, -3);
    const y = decimalAdjust(q.y, -3);
    const z = decimalAdjust(q.z, -3);
    const w = decimalAdjust(q.w, -3);

    const xPos = ((x === 0.5) && (y === 0.5) && (z === 0.5) && (w === 0.5));
    const xNeg = ((x === -0.5) && (y === 0.5) && (z === 0.5) && (w === -0.5));
    const yPos = ((x === 0) && (y === 0.707) && (z === 0.707) && (w === 0));
    const yNeg = ((x === 0.707) && (y === 0) && (z === 0) && (w === 0.707));
    const zPos = ((x === 0) && (y === 0) && (z === 0) && (w === 1));
    const zNeg = ((x === 0) && (y === 1) && (z === 0) && (w === 0));

    if (xPos || xNeg) {
      worldPos.x = 0;
    } else if (yPos || yNeg) {
      worldPos.y = 0;
    } else if (zPos || zNeg) {
      worldPos.z = 0;
    } else {
      console.warn('unsupported ortho camera for snapping');
    }

    return worldPos;
  }
};
