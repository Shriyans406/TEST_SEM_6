'use strict';

const $ = require('jquery');

const Binding = require('./Binding');

class Slider extends Binding {

  constructor(model, field, options) {
    super(model, field);
    options = options || {};

    // Check the options json for 'step' parameter (default=1)
    const defaults = {
      step: 1,
      min: 0,
      max: 10,
    };
    for (let key in defaults) {
      if(!options.hasOwnProperty(key)) {
        options[key] = defaults[key];
      }
    }

    const $el = $('<input ' +
      'class="' + field + '"' +
      ' type="range"' +
      ' name="' + field + '"' +
      ' value="' + model[field] + '"' +
      ' min="' + options.min + '"' +
      ' max="' + options.max + '"' +
      ' step="' + options.step + '"' +
      '>');

    $el[0]['oninput'] = () => {

      let v = $el.val();
      try {
        model[field] = v;
      } catch(e) {
        // do nothing
      }

    };

    model.on('change', () => {
      const stringVal = String(model[field]);
      if(this.$el.val() !== stringVal) {
        this.$el.val(stringVal);
      }
    });

    this.$el = $el;
  }

}

module.exports = Slider;
