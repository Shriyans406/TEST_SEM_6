'use strict';

const tripcore = require('trip.core');

class EventCaptureModel extends tripcore.Model {

  constructor() {
    super();
    this.events = [];
  }

  addEvent(type, event, data) {
    this.events.push({type: type, event: event, data: data});
    if (this.events.length > 30) {
      this.events = this.events.slice(1);
    }
    this.emitChange();
  }

}

module.exports = EventCaptureModel;
