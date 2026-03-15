'use strict';

const THREE = require('three');

const toWorldPosition = require('./toWorldPosition');
const decimalAdjust = require('./decimalAdjust');
const rayFromWorldAndCamera = require('./rayFromWorldAndCamera');

function findClosestMesh(scene, meshes, position) {
  const camera = scene.camera;
  const worldPos = toWorldPosition(scene.width, scene.height, camera, position);
  const ray = rayFromWorldAndCamera(worldPos, camera);
  const raycaster = new THREE.Raycaster(ray.origin, ray.direction);

  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length) {
    const sorted = intersects.sort(function(a, b) {
      if (a.distance < b.distance) {
        return -1;
      } else if (a.distance > b.distance) {
        return 1;
      } else {
        return 0;
      }
    });
    return {
      distance: sorted[0].distance,
      mesh: sorted[0].object,
      position: sorted[0].point,
    };
  } else {
    return undefined;
  }
}

function collectViewsAndMeshes(scene, viewFilter) {
  const viewsAndMeshes = scene.views.reduce(function(acc, view) {
    if (view.noEvents) {
      return acc;
    }
    const meshes = [];
    if (viewFilter(view)) {
      view.sceneObject.traverseVisible(function(obj) {
        if (obj instanceof THREE.Mesh) {
          meshes.push(obj);
        }
      });
    }

    if (meshes.length) {
      acc.push({
        view: view,
        meshes: meshes
      });
    }
    return acc;
  }, []);
  return viewsAndMeshes;
}

module.exports = function(scene, screenPos, viewFilter) {
  if (!viewFilter) {
    viewFilter = function() { return true; };
  }
  const viewsAndMeshes = collectViewsAndMeshes(scene, viewFilter);
  const viewLookup = viewsAndMeshes.reduce(function(acc, viewAndMeshes) {
    const view = viewAndMeshes.view;
    viewAndMeshes.meshes.reduce(function(acc, mesh) {
      acc[mesh.id] = view;
      return acc;
    }, acc);
    return acc;
  }, {});

  const allMeshes = viewsAndMeshes.reduce(function(acc, viewAndMeshes) {
    acc = acc.concat(viewAndMeshes.meshes);
    return acc;
  }, []);

  const closest = findClosestMesh(scene, allMeshes, screenPos);
  if (closest !== undefined) {
    return {
      distance: closest.distance,
      position: new THREE.Vector3(
        decimalAdjust(closest.position.x, -3),
        decimalAdjust(closest.position.y, -3),
        decimalAdjust(closest.position.z, -3)),
      view: viewLookup[closest.mesh.id],
      mesh: closest.mesh,
    };
  } else {
    return undefined;
  }
};
