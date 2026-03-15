'use strict';

const $ = require('jquery');
const isString = require('lodash.isstring');

const Binding = require('./Binding');

class Select extends Binding {

  constructor(model, field) {
    super(model, field);

    const value = model[field];
    const spec = model[field + 'Spec'];
    const $el = $('<select name="' + field + '" class="' + field + '">' +
      spec.map(option => {
        let optionLabel;
        let optionValue;
        if (isString(option)) {
          optionLabel = option;
          optionValue = option;
        } else {
          optionLabel = option.label;
          optionValue = option.value;
        }
        return '<option value="' + optionValue + '"' +
          ((value === optionValue) ? ' selected="selected"' : ' ') +
          '>' + optionLabel + '</option>';
      }). join('') + '</select>');
    const stringVal = String(model[field]);
    $el.val(stringVal);

    $el.change(() => {
      let v = $el.val();
      // Actually find the non-string value in the spec
      spec.forEach(option => {
        if (isString(option)) {
          if (option === v) {
            model[field] = v;
          }
        } else {
          if (String(option.value) === v) {
            model[field] = option.value;
          }
        }
      });
    });
    model.on('change', () => {
      const stringVal = String(model[field]);
      if ($el.val() !== stringVal) {
        $el.val(stringVal);
      }
    });
    this.$el = $el;
  }

}

module.exports = Select;
