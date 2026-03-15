'use strict';

const tripdom = require('trip.dom');
const ee = require('event-emitter');
const $ = tripdom.$;

// Add offset support to all browsers
function addOffset(element, event) {
  event.offsetX = Math.round((event.pageX - element.offset().left));
  event.offsetY = Math.round((event.pageY - element.offset().top));
  return event;
}

function eventToPosition(event) {
  return {
    x: event.offsetX,
    y: event.offsetY,
  };
}

var DRAG_THRESHOLD = 8; // px, radius

function overDragThreshold(pos2, mouseDownEvent) {
  var pos1 = eventToPosition(mouseDownEvent);
  var dx = Math.abs(pos1.x - pos2.x);
  var dy = Math.abs(pos1.y - pos2.y);
  return Math.sqrt(dx*dx + dy*dy) > DRAG_THRESHOLD;
}

class ContainerEventGenerator {

  constructor(container) {
    ee(this);
    var _this = this;

    var dragging = false;
    var mouseDownEvent;

    container.bind('contextmenu', function(event) {
      event.preventDefault();
    });

    // Can't use jQuery's 'click' event, as we don't want to
    // emit a 'click' when dragging
    container.bind('mousedown', function(event) {
      addOffset(container, event);
      mouseDownEvent = event;
      _this.emit('mousedown', event, eventToPosition(event));
    });

    container.on('mousemove', function(event) {
      addOffset(container, event);
      let position = eventToPosition(event);
      if (mouseDownEvent &&
          !dragging &&
          overDragThreshold(position, mouseDownEvent)) {
        if (!dragging) {
          _this.emit('startdrag', mouseDownEvent, position);
        }
        dragging = true;
      }
      if (dragging) {
        _this.emit('drag', event, position, eventToPosition(mouseDownEvent));
      } else {
        _this.emit('mousemove', event, position);
      }
    });

    $(window).on('mouseup', function(event) {
      // When the mouse up is on a different container, ignore it
      if (mouseDownEvent) {
        addOffset(container, event);
        if (!dragging) {
          _this.emit('mouseup', event, eventToPosition(event));
          _this.emit('click', event, eventToPosition(mouseDownEvent));
        }
        if (dragging) {
          dragging = false;
          _this.emit('stopdrag', event, eventToPosition(event));
        }
        mouseDownEvent = undefined;
      }
    });

    container.on('mouseenter', function(event) {
      _this.emit('mouseenter', event, eventToPosition(event));
    });

    container.on('mouseleave', function(event) {
      _this.emit('mouseleave', event, eventToPosition(event));
    });

    $(document).on('keyup', function(event) {
      _this.emit('keyup', event);
    });

    const wheelEventListener = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const data = event.wheelDelta ?
        -event.wheelDelta/120 :
        event.detail;
      _this.emit('mousewheel', event, data);
    };

    // http://www.javascriptkit.com/javatutors/onmousewheel.shtml
    const mouseWheelEvent = (/Firefox/i.test(navigator.userAgent)) ?
      "DOMMouseScroll" : "mousewheel"; // FF doesn't recognize mousewheel as of FF3.x

    if (document.attachEvent) {
      // if IE (and Opera depending on user setting)
      document.attachEvent("on" + mouseWheelEvent, wheelEventListener);
    } else if (document.addEventListener) {
      // WC3 browsers
      document.addEventListener(mouseWheelEvent, wheelEventListener);
    }
  }

}

module.exports = ContainerEventGenerator;
