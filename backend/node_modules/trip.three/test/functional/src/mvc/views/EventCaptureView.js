'use strict';

const tripdom = require('trip.dom');

class EventCaptureView extends tripdom.View {

  constructor(model, scene) {
    super(model, scene);
  }

  render() {
    super.render();
    var template =
      '{{#events}}' +
        '<div class="event">' +
          '<div class="type">{{type}}</div>' +
          '{{#position}}' +
            '{{#x}}<div class="x">{{.}}</div>{{/x}}' +
            '{{#y}}<div class="y">{{.}}</div>{{/y}}' +
            '{{#z}}<div class="z">{{.}}</div>{{/z}}' +
          '{{/position}}' +
        '</div>' +
      '{{/events}}';
    var reversedEvents = this.model.events.slice(0);
    reversedEvents.reverse();
    reversedEvents = reversedEvents.map(function(eventStruct) {
      return {
        type: eventStruct.type,
        position: eventStruct.data,
      };
    });
    this.toHtml(template, {
      events: reversedEvents
    });
  }

  update() {
    this.render();
  }

}

module.exports = EventCaptureView;
