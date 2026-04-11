'use strict';

const $ = require('jquery');

const Binding = require('./Binding');

class TextInput extends Binding {

  constructor(model, field) {
    super(model, field);

    const $el = $('<input ' +
      'class="' + field + '"' +
      ' type="text" ' +
      ' name="' + field + '"' +
      ' value="' + model[field] + '"' +
      '>');
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

module.exports = TextInput;
