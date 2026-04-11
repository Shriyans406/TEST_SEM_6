'use strict';

const $ = require('jquery');

const Binding = require('./Binding');

class NumberInput extends Binding {

  constructor(model, field, options) {
    super(model, field);
    options = options || {};

    const $el = $('<input ' +
      'class="' + field + '"' +
      ' type="number"' +
      ' name="' + field + '"' +
      ' value="' + model[field] + '"' +
      '>');

    if (options.hasOwnProperty('min')) {
      $el.attr('min', options.min);
    }
    if (options.hasOwnProperty('max')) {
      $el.attr('max', options.max);
    }
    if (options.hasOwnProperty('step')) {
      $el.attr('step', options.step);
    }

    ['onpaste', 'oninput'].forEach(event => {
      $el[0][event] = () => {
        let v = $el.val();
        try {
          model[field] = v;
        } catch(e) {
          // use events for validation errors
        }
      };
    });
    model.on('change', () => {
      const stringVal = String(model[field]);
      if (this.$el.val() !== stringVal) {
        $el.val(stringVal);
      }
    });

    this.$el = $el;
  }

}

module.exports = NumberInput;
