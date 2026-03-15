'use strict';

const $ = require('jquery');

const Binding = require('./Binding');

class Checkbox extends Binding {

  constructor(model, field) {
    super(model, field);

    const $el = $('<input class="' + field + '"' +
      ' type="checkbox" ' +
      ' name="' + field + '"' +
      (model[field] ? 'checked' : '') + '>');
    ['onchange'].forEach(event => {
      $el[0][event] = () => {
        const v = !!$el.prop('checked');
        try {
          model[field] = v;
        } catch(e) {
          // use events for validation errors
        }
      };
    });
    model.on('change', (changeField, changeValue) => {
      if (this.$el.val() !== model[field]) {
        $el.prop('checked', changeValue);
      }
    });

    this.$el = $el;
  }

}

module.exports = Checkbox;
