'use strict';

const cloneDeep = require('lodash.clonedeep');
const THREE = require('three');

const toWorldPosition = require('./util/toWorldPosition');
const rayFromWorldAndCamera = require('./util/rayFromWorldAndCamera');
const decimalAdjust = require('./util/decimalAdjust');

class Trackball {

  constructor(scene, rawEventGenerator) {

    let target = {
      lookAt: new THREE.Vector3(),
      azimuth: -Math.PI/2,
      elevation: Math.PI/2,
      up: new THREE.Vector3(0,0,1),
      distance: 20,
    };

    this.__defineGetter__('currentTarget', () => {
      return cloneDeep(target);
    });

    function updateCamera() {
      if (scene.mode === 'perspective') {
        let r = target.distance;
        let elev = target.elevation;
        let azim = target.azimuth;
        let lookAt = target.lookAt;
        scene.perspectiveCamera.position.set(
          decimalAdjust(lookAt.x + r*Math.sin(elev) * Math.cos(azim), -6),
          decimalAdjust(lookAt.y + r*Math.sin(elev) * Math.sin(azim), -6),
          decimalAdjust(lookAt.z + r*Math.cos(elev), -6));
        scene.perspectiveCamera.aspect = scene.aspect;
        scene.perspectiveCamera.updateProjectionMatrix();
      } else {
        let aspect = scene.aspect;
        let span = target.distance/2;
        let lookAt = target.lookAt;
        scene.orthographicCamera.left = -span;
        scene.orthographicCamera.right = span;
        scene.orthographicCamera.top = span/aspect;
        scene.orthographicCamera.bottom = -span/aspect;
        scene.orthographicCamera.updateProjectionMatrix();

        let r = scene.camera.far/2;
        scene.camera.position.set(
          decimalAdjust(
            lookAt.x + r*Math.sin(target.elevation) * Math.cos(target.azimuth), -6),
          decimalAdjust(
            lookAt.y + r*Math.sin(target.elevation) * Math.sin(target.azimuth), -6),
          decimalAdjust(
            lookAt.z + r*Math.cos(target.elevation), -6));
      }

      // scene.layers.forEach((layer) => {
      //   layer.position.copy(target.lookAt);
      // });
      scene.camera.up = target.up;

      // NB lookAt() should be called after updating up and position
      // since those two values are used to determine the rotation matrix

      scene.camera.lookAt(target.lookAt);

      scene.redraw();
    }

    this.updateCamera = updateCamera;

    let state;
    let azimElevOnDragStart;
    let lastMousePosition;
    let cameraPositionAtStart;
    let mouseLeftVec;
    let mouseUpVec;

    function startDrag(event, eventPosition) {
      azimElevOnDragStart = {
        azimuth: target.azimuth,
        elevation: target.elevation,
      };
      cameraPositionAtStart = scene.camera.position.clone();
      lastMousePosition = eventPosition;

      // Use center of screen to find ray direction
      const centerScreenPos = {x: scene.width/2, y: scene.height/2};
      const centerWorldPos = toWorldPosition(
        scene.width, scene.height, scene.camera, centerScreenPos);
      const ray = rayFromWorldAndCamera(centerWorldPos, scene.camera);

      const camVec = ray.direction;
      const upVec = target.up;

      mouseLeftVec = new THREE.Vector3().crossVectors(upVec, camVec);
      mouseUpVec = new THREE.Vector3().crossVectors(camVec, mouseLeftVec);
    }

    function drag(event, eventPosition, mouseDownPosition) {
      var dMouseFromDown = {
        x: eventPosition.x - mouseDownPosition.x,
        y: eventPosition.y - mouseDownPosition.y,
      };
      var dMouseFromLast = {
        x: eventPosition.x - lastMousePosition.x,
        y: eventPosition.y - lastMousePosition.y,
      };

      if (state === undefined) {
        if (!event.shiftKey && (event.button === 0) && (scene.mode === 'perspective')) {
          state = 'rotating';
        } else if ((event.button === 2) ||
          ((event.button === 0) && event.shiftKey)) {
          state = 'panning';
        }
      }

      if (state === 'rotating') {
        let zoomDamp = 0.01;
        target.azimuth = azimElevOnDragStart.azimuth - dMouseFromDown.x * zoomDamp;
        target.elevation = azimElevOnDragStart.elevation - dMouseFromDown.y * zoomDamp;
        target.elevation = target.elevation > Math.PI ? Math.PI : target.elevation;
        target.elevation = target.elevation < 0 ? 0 : target.elevation;
        updateCamera();
      }

      if (state === 'panning') {

        // The camera moved in the opposite direction
        var dPos = mouseLeftVec.clone().multiplyScalar(dMouseFromLast.x)
          .add(mouseUpVec.clone().multiplyScalar(dMouseFromLast.y));
        const factor = (scene.mode === 'perspective') ? 0.0015 : 0.0008;
        dPos.multiplyScalar(target.distance*factor);
        target.lookAt.add(dPos);
        updateCamera();
      }

      lastMousePosition = eventPosition;

    }

    function cancel() {
      state = undefined;
      lastMousePosition = undefined;
      updateCamera();
    }

    // We want to keep rotating/panning if the mouse leaves
    // the window and re-enters, but if the user has lifted the
    // mouse button during the time off-window, the operation
    // should be cancelled
    function windowMouseUp() {
      if (state) {
        cancel();
      }
    }

    function mouseWheel(event, amount) {
      target.distance += amount*target.distance/100;
      updateCamera();
    }

    rawEventGenerator.on('startdrag', startDrag);
    rawEventGenerator.on('drag', drag);
    rawEventGenerator.on('stopdrag', cancel, this);
    rawEventGenerator.on('windowmouseup', windowMouseUp, this);
    rawEventGenerator.on('mousewheel', mouseWheel, this);

    this.setTarget = function(newTarget) {
      // May be plain JS objects instead of THREE.Vector3 objects
      const lookAt = (newTarget.lookAt === undefined) ?
        new THREE.Vector3() :
        new THREE.Vector3(newTarget.lookAt.x, newTarget.lookAt.y, newTarget.lookAt.z);
      const up = (newTarget.up === undefined) ?
        new THREE.Vector3(0,0,1) :
        new THREE.Vector3(newTarget.up.x, newTarget.up.y, newTarget.up.z);
      target = {
        lookAt: lookAt,
        azimuth: newTarget.azimuth === undefined ? -Math.PI/2 : newTarget.azimuth,
        elevation: newTarget.elevation === undefined ? Math.PI/2 : newTarget.elevation,
        up: up,
        distance: newTarget.distance || 20,
      };
      updateCamera();
    };

    this.getTarget = function() {
      return cloneDeep(target);
    };

    this.updateTarget = function(newTarget) {
      target = {
        lookAt: newTarget.lookAt || target.lookAt,
        azimuth: newTarget.azimuth === undefined ? target.azimuth : newTarget.azimuth,
        elevation: newTarget.elevation === undefined ? target.elevation : newTarget.elevation,
        up: newTarget.up || target.up,
        distance: newTarget.distance || target.distance,
      };
      updateCamera();
    };

    updateCamera();
  }

}

module.exports = Trackball;
