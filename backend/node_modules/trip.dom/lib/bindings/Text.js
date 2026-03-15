'use strict';

const $ = require('jquery');

const Binding = require('./Binding');

class Text extends Binding {

  constructor(model, field) {
    super(model, field);

    const $el = $('<span class="' + field + '">' + model[field] + '</span>');
    model.on('change', () => {
      const stringVal = String(model[field]);
      if (stringVal !== $el.text()) {
        $el.html(stringVal);
      }
    });
    this.$el = $el;
  }

}

module.exports = Text;
