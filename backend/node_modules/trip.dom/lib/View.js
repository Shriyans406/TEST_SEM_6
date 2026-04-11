'use strict';

const isObject = require('lodash.isobject');
const isArray = require('lodash.isarray');
const keys = require('lodash.keys');
const $ = require('jquery');
const mustache = require('mustache');
const tripcore = require('trip.core');
const mergeOptions = require('./mergeoptions');

const ViewControllerMixin = require('./ViewControllerMixin');
const Binding = require('./bindings/Binding');

class View extends tripcore.View {

  constructor(model, scene, options) {
    super(model, scene);
    options = options || {};
    options.tag = options.tag || 'div';
    this.controllerMixin = ViewControllerMixin;
    this.options = options;
    let template = '<{{tag}} ' +
      '{{#id}}id="{{.}}"{{/id}} ' +
      '{{#class}}class="{{.}}"{{/class}} ' +
      '{{#title}}title="{{.}}"{{/title}} ' +
      '{{#style}}style="{{.}}"{{/style}} ' +
      '{{#draggable}}draggable="true"{{/draggable}} ' +
      '></{{tag}}>';
    this.$el = $(mustache.render(template, this.options));
    // Keep track of when element is added to DOM
    this.detached = true;
  }

  static mergeOptions(a, b) {
    return mergeOptions(a, b, {
      concatenations: ['class', 'style'],
    });
  }

  render() {
    if (this.detached) {
      if ($(this.scene.container)[0]) {
        if (this.options.prepend) {
          $(this.scene.container).prepend(this.$el);
        } else {
          $(this.scene.container).append(this.$el);
        }
        this.detached = false;
      } else {
        console.error('no element for selector:', this.scene.container);
      }
    }
    this.$el.empty();
  }

  update() {
    console.warn('update not implemented for View');
  }

  toHtml(template, view) {
    let placeHolders = {};
    let counter = 0;
    function replaceBindings(x) {
      if (isArray(x)) {
        x.forEach((y, i) => {
          if (y instanceof Binding) {
            let id = '__' + (counter++) + '__';
            x[i] = '<div class="placeholder" id="' + id + '"></div>';
            placeHolders[id] = y;
          } else {
            replaceBindings(y);
          }
        });
      } else if (isObject(x)) {
        keys(view).forEach(key => {
          let val = x[key];
          if (val instanceof Binding) {
            let id = '__' + (counter++) + '__';
            view[key] = '<div class="placeholder" id="' + id + '"></div>';
            placeHolders[id] = val;
          } else {
            replaceBindings(val);
          }
        });
      }
    }

    // Replace binding with placeholder HTML elements, the usen standard
    // mustache to render, the replace with binding element DOM. An alternative
    // would be to fork mustache to do this directly.
    replaceBindings(view);
    this.$el.html(mustache.render(template, view));
    keys(placeHolders).forEach(id => {
      this.$el.find('.placeholder#' + id).replaceWith(placeHolders[id].$el);
    }, this);

  }

  remove() {
    super.remove();
    this.$el.remove();
    this.$el = undefined;
  }

  hide() {
    this.$el.remove();
    this.hidden = true;
  }

  show() {
    this.emit('pre_render');
    if (this.options.prepend) {
      $(this.scene.container).prepend(this.$el);
    } else {
      $(this.scene.container).append(this.$el);
    }
    this.emit('post_render');
    this.hidden = false;
  }


}

module.exports = View;
