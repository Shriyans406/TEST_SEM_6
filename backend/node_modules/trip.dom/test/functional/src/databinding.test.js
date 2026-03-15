'use strict';

const keys = require('lodash.keys');
const trip = require('trip.core');

const lib = require('../../../');
const Scene = lib.Scene;
const View = lib.View;
const TextInput = lib.TextInput;
const NumberInput = lib.NumberInput;
const Text = lib.Text;
const Select = lib.Select;
const Checkbox = lib.Checkbox;
const Slider = lib.Slider;

class BindingModel extends trip.Model {

  constructor() {
    super();

    var fields = {
      foo: 'some string',
      bar: 'b',
      fob: 5,
      baz: true,
      bob: 1,
    };

    var fieldSpecs = {
      bar: ['a', 'b', 'c'],
      bob: [{label: 'one', value: 1}, {label: 'two', value: 2}],
    };

    keys(fields).forEach(key => {
      this.__defineSetter__(key, value => {
        fields[key] = value;
        this.emitChange(key, value);
      });

      this.__defineGetter__(key, () => {
        return fields[key];
      });

      this.__defineGetter__(key + 'Spec', () => {
        return fieldSpecs[key];
      });
    });
  }

}

class BindingView extends View {

  constructor(model, scene) {
    super(model, scene);
  }

  render() {
    super.render();

    var view = {
      bindings: [
        new TextInput(this.model, 'foo'),
        new TextInput(this.model, 'foo'),
        new Text(this.model, 'foo'),
        '<hr>',
        new Select(this.model, 'bar'),
        new Select(this.model, 'bar'),
        new Text(this.model, 'bar'),
        '<hr>',
        new Slider(this.model, 'fob', { step: 0.5 }),
        new NumberInput(this.model, 'fob', {step: 2}),
        new Text(this.model, 'fob'),
        '<hr>',
        new Select(this.model, 'bob'),
        new Select(this.model, 'bob'),
        new Text(this.model, 'bob'),
        '<hr>',
        new Checkbox(this.model, 'baz'),
        new Checkbox(this.model, 'baz'),
        new Text(this.model, 'baz'),
      ]
    };

    var template = `
      {{#bindings}}
        <div>{{{.}}}</div>
      {{/bindings}}`;

    this.toHtml(template, view);
  }

  update() {
    // All updates handled by data bindings
  }

}

class BindingController extends trip.Controller {

  constructor() {
    super(new BindingModel());
    this.addView(new Scene('#dom'), BindingView);
  }

}

new BindingController();
