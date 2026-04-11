'use strict';

const tripcore = require('trip.core');
const $ = require('trip.dom').$;
const THREE = require('three');

const RawEventGenerator = require('./RawEventGenerator');
const ViewEventGenerator = require('./ViewEventGenerator');
const Trackball = require('./Trackball');
const toScreenPosition = require('./util/toScreenPosition');

class Scene extends tripcore.Scene {

  constructor(container, options) {
    super(container, options);
    const $container = $(container);
    options = (options === undefined) ? {} : options;

    this.rawEventGenerator = new RawEventGenerator($container);
    this.viewEventGenerator = new ViewEventGenerator(this);
    this.views = [];

    // Each layer has a scene
    const layers = [new THREE.Scene()];
    layers[0].index = 0;
    if (options.layers) {
      for (var i = 1; i < options.layers; ++i) {
        layers.push(new THREE.Scene());
        layers[layers.length - 1].index = i;
      }
    }
    this.layers = layers;

    // lights
    var directionalLights = [];
    if (!options.noLights) {
      directionalLights = layers.map(function(layer) {
        var light = new THREE.DirectionalLight(0xffffff);
        light.position.set(-1, -1, -1);
        layer.add(light);
        layer.add(new THREE.AmbientLight(0x222222));
        light.castShadow = true;
        return light;
      });
    }

    // renderer
    this.width = $container.width();
    this.height = $container.height();
    this.aspect = this.width/this.height;
    let redraw = true;

    const clear = options.clear === undefined ? true : options.clear;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: !clear,
    });
    if (clear) {
      const clearColor = options.clearColor === undefined ? 0xffffff : options.clearColor;
      const clearOpacity = options.clearOpacity === undefined ? 1 : options.clearOpacity;
      renderer.setClearColor(clearColor, clearOpacity);
    }
    renderer.autoClear = false;
    renderer.setSize(this.width, this.height);
    if (options.enableShadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.cullFace = THREE.CullFaceBack;
    }
    $container[0].appendChild(renderer.domElement);

    // debug
    // scene.add(new THREE.Mesh(
    //   new THREE.BoxGeometry(1,1,1),
    //   new THREE.MeshLambertMaterial({color: 0x0000ff, transparent: true, opacity: 0.5})));

    // Cameras
    var near = options.near || 0.1;
    var far = options.far || 10000;
    this.perspectiveCamera = new THREE.PerspectiveCamera(60, this.width/this.height, near, far);
    this.orthographicCamera = new THREE.OrthographicCamera(-10000, 10000, 5000, -5000, near, far);

    let mode;
    if ((options.mode === undefined) || (options.mode === 'perspective')) {
      mode = 'perspective';
      this.camera = this.perspectiveCamera;
    } else if (options.mode === 'orthographic') {
      mode = 'orthographic';
      this.camera = this.orthographicCamera;
    } else {
      throw new Error('unknown mode:' + options.mode);
    }

    this.__defineSetter__('mode', (val) => {
      if (val === 'perspective') {
        mode = val;
        this.camera = this.perspectiveCamera;
      } else if (val === 'orthographic') {
        mode = val;
        this.camera = this.orthographicCamera;
      } else {
        throw new Error('unknown mode:' + mode);
      }
    });

    this.__defineGetter__('mode', function() {
      return mode;
    });

    this.redraw = function() {
      redraw = true;
    };

    this.trackball = new Trackball(this, this.rawEventGenerator);
    this.trackball.setTarget({
      distance: options.distance,
      azimuth: options.azimuth,
      elevation: options.elevation,
    });

    const _this = this;

    function render() {
      let camera = _this.camera;
      if (redraw) {
        _this.emit('pre_render', camera);
        directionalLights.forEach(function(light) {
          light.position.copy(camera.position);
        });
        renderer.clear();
        renderer.render(layers[0], camera);
        for (var i = 1; i < layers.length; ++i) {
          renderer.clearDepth();
          renderer.render(layers[i], camera);
        }
        _this.emit('post_render', camera);
        redraw = false;
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      render();
    }
    this.render = render;

    function resize() {
      _this.width = $container.width();
      _this.height = $container.height();
      _this.aspect = _this.width/_this.height;
      _this.trackball.updateCamera();
      renderer.setSize(_this.width, _this.height);
      redraw = true;
    }

    this.forceResize = function() {
      resize();
    };

    this.addView = function(view) {
      this.views.push(view);
      var layer = view.layer || 0;
      layers[layer].add(view.sceneObject);
      // view.render() called on next tick
      view.once('post_render', () => {
        redraw = true;
      });
    };

    this.removeView = function(view) {
      var layer = view.layer || 0;
      var index = this.views.indexOf(view);
      if (index === -1) {
        throw new Error('view not found');
      }
      this.views.splice(index, 1);
      layers[layer].remove(view.sceneObject);
      redraw = true;
    };

    window.addEventListener('resize', resize, false);
    // Resize on the next event loop tick since a scroll bar may have been added
    // in the meantime.
    setTimeout(resize, 1);

    animate();

  }

  setPerspective() {
    this.mode = 'perspective';
    this.orthoMode = undefined;
    this.trackball.setTarget({
      azimuth: Math.PI/4,
      elevation: 1.08,
    });
  }

  setOrthoXPos() {
    this.mode = 'orthographic';
    this.orthoMode = '+x';
    this.trackball.setTarget({
      elevation: Math.PI/2,
      azimuth: 0,
    });
  }

  setOrthoXNeg() {
    this.mode = 'orthographic';
    this.orthoMode = '-x';
    this.trackball.setTarget({
      elevation: Math.PI/2,
      azimuth: Math.PI,
    });
  }

  setOrthoYPos() {
    this.mode = 'orthographic';
    this.orthoMode = '+y';
    this.trackball.setTarget({
      elevation: Math.PI/2,
      azimuth: Math.PI/2,
    });
  }

  setOrthoYNeg() {
    this.mode = 'orthographic';
    this.orthoMode = '-y';
    this.trackball.setTarget({
      elevation: Math.PI/2,
      azimuth: Math.PI*3/2,
    });
  }

  setOrthoZPos() {
    this.mode = 'orthographic';
    this.orthoMode = '+z';
    this.trackball.setTarget({
      azimuth: 0,
      elevation: 0,
      up: new THREE.Vector3(0,1,0),
    });
  }

  setOrthoZNeg() {
    this.mode = 'orthographic';
    this.orthoMode = '-z';
    this.trackball.setTarget({
      azimuth: 0,
      elevation: Math.PI,
      up: new THREE.Vector3(0, 1, 0),
    });
  }

  getState() {
    return {
      mode: this.mode,
      orthoMode: this.orthoMode,
      target: this.trackball.getTarget(),
    };
  }

  setState(state) {
    this.mode = state.mode;
    this.orthoMode = state.orthoMode;
    this.trackball.setTarget(state.target);
  }

  // Poor man's zoom to extents. Check the bounds on screen
  // coordinates and adjust the distance to fit the layers
  // into the screen coords.
  //
  // Because of the non-linear perspective camera, call it twice
  // to avoid problems of large zoom out factors due to points
  // a long distance out of the screen towards observer
  zoomToExtents(filters) {
    if (!filters) {
      filters = {};
    }
    if (!filters.view) {
      filters.view = () => {
        return true;
      };
    }
    if (!filters.layer) {
      filters.layer = () => {
        return true;
      };
    }

    let filteredViews = this.views.filter((view) => {
      return filters.view(view) && filters.layer(view.layer);
    });

    const _this = this;
    function zoom() {

      let bounds = new THREE.Box3();
      filteredViews.forEach((v) => {
        bounds.union(new THREE.Box3().setFromObject(v.sceneObject));
      });

      if (bounds.isEmpty()) {
        console.warn('empty bounds');
        return;
      }

      _this.trackball.updateTarget({
        lookAt: bounds.center(),
      });
      _this.trackball.updateCamera();
      // render() somehow changes the camera state, not sure why _this
      // is necessary
      _this.render();

      // Find the screen coordinates of bounding Box corners
      let worldPositions = [
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
      ];
      // Distance from center
      let dx = -Infinity;
      let dy = -Infinity;
      let halfWidth = _this.width/2;
      let halfHeight = _this.height/2;
      let centerX = halfWidth;
      let centerY = halfHeight;
      for (let i = 0; i < worldPositions.length; ++i) {
        let screenPos = toScreenPosition(
          _this.width, _this.height, _this.camera, worldPositions[i]);
        let dx2 = Math.abs(screenPos.x - centerX);
        let dy2 = Math.abs(screenPos.y - centerY);
        if (dx2 > dx) {
          dx = dx2;
        }
        if (dy2 > dy) {
          dy = dy2;
        }
      }

      let xFactor = dx/halfWidth;
      let yFactor = dy/halfHeight;
      let factor = Math.max(xFactor, yFactor);

      _this.trackball.updateTarget({
        distance: _this.trackball.currentTarget.distance*factor,
      });
      return factor;
    }

    const f = zoom();
    // See function description
    if ((f > 1.0) && (this.mode === 'perspective')) {
      zoom();
    }

  }

}

module.exports = Scene;
