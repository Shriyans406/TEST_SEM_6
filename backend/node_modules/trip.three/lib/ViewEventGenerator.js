'use strict';

const ee = require('event-emitter');

const findClosestViewForScreenPosition = require('./util/findClosestViewForScreenPosition');

class ViewEventGenerator {

  constructor(scene) {

    var eventGenerator = scene.rawEventGenerator;
    ee(this);

    var _this = this;
    eventGenerator.on('click', function(event, position) {

      var closestViewResult = findClosestViewForScreenPosition(scene, position);
      if (closestViewResult) {
        _this.emit(
          'click',
          event,
          closestViewResult);
      } else {
        _this.emit('noclick', event);
      }
    });

    var lastOver;
    eventGenerator.on('mousemove', function(event, position) {
      var over = findClosestViewForScreenPosition(scene, position);
      if (over) {
        // Either entered or cross to another view
        if (over.view !== (lastOver && lastOver.view)) {
          if (lastOver && lastOver.view) {
            _this.emit('mouseleave', event, lastOver);
          }
          _this.emit(
            'mouseenter', event, over);
        }
        lastOver = over;
        _this.emit('mouseover', event, over);
      } else {
        if (lastOver) {
          _this.emit('mouseleave', event, lastOver);
        }
        lastOver = undefined;
      }
    });

  }
}

module.exports = ViewEventGenerator;
