'use strict';

const THREE = require('three');

module.exports = function(width, height, camera, worldCoordinates) {
  worldCoordinates = worldCoordinates.clone();
  var projScreenMat = new THREE.Matrix4();
  projScreenMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  worldCoordinates.applyProjection(projScreenMat);
  return {
    x: width * ((worldCoordinates.x+1)/2),
    y: height * ((-worldCoordinates.y+1)/2)
  };
};
