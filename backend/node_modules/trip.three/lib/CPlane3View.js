'use strict';

const THREE = require('three');
const V3 = THREE.Vector3;

const View = require('./View');

class CPlane3View extends View {

  constructor(model, scene, options) {
    options = options || {};
    super(model, scene, options);
    this.hideGrid = !!options.hideGrid;
  }

  render() {
    super.render();

    const origin = new V3(this.model.origin.x, this.model.origin.y, this.model.origin.z);
    const normal = new V3(this.model.normal.x, this.model.normal.y, this.model.normal.z);
    const localX = new V3(this.model.localX.x, this.model.localX.y, this.model.localX.z);
    const localY = new V3().crossVectors(normal, localX);

    const gridExtents = this.model.extents;
    const axesGeometry = new THREE.Geometry();
    const axesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    axesGeometry.vertices.push(localX.clone().multiplyScalar(+gridExtents));
    axesGeometry.vertices.push(localX.clone().multiplyScalar(-gridExtents));
    axesGeometry.vertices.push(localY.clone().multiplyScalar(+gridExtents));
    axesGeometry.vertices.push(localY.clone().multiplyScalar(-gridExtents));
    this.sceneObject.add(new THREE.LineSegments(axesGeometry, axesMaterial));

    if (this.model.snapGrid && !this.hideGrid) {
      const minorGeometry = new THREE.Geometry();
      const minorMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 1 });
      const gridSize = this.model.size;
      const n = gridExtents/gridSize;

      const localYMin = localY.clone().multiplyScalar(-gridExtents);
      const localYMax = localY.clone().multiplyScalar(+gridExtents);
      for (let x = -n; x <= n; ++x) {
        if (x !== 0) {
          minorGeometry.vertices.push(
            new V3().addVectors(
              localX.clone().multiplyScalar(x*gridSize),
              localYMin));
          minorGeometry.vertices.push(
            new V3().addVectors(
              localX.clone().multiplyScalar(x*gridSize),
              localYMax));
        }
      }
      const localXMin = localX.clone().multiplyScalar(-gridExtents);
      const localXMax = localX.clone().multiplyScalar(+gridExtents);
      for (let y = -n; y <= n; ++y) {
        if (y !== 0) {
          minorGeometry.vertices.push(
            new V3().addVectors(
              localY.clone().multiplyScalar(y*gridSize),
              localXMin));
          minorGeometry.vertices.push(
            new V3().addVectors(
              localY.clone().multiplyScalar(y*gridSize),
              localXMax));
        }
      }
      this.sceneObject.add(new THREE.LineSegments(minorGeometry, minorMaterial));
    }
    this.sceneObject.position.copy(origin);
  }

  update() {
    this.render();
  }

}

module.exports = CPlane3View;
