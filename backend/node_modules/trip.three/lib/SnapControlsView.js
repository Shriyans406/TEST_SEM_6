'use strict';

const tripdom = require('trip.dom');
const DOMView = tripdom.View;

class CPlaneControlsView extends DOMView {

  constructor(model, scene, options) {
    super(model, scene, DOMView.mergeOptions(options || {}, {
      class: 'gridcontrols'
    }));
  }

  render() {
    super.render();
    var template =
      `<div>
        <label><input type="checkbox" name="snap-surface" value="snap-surface">
          surface</input></label>
        <label><input type="checkbox" name="snap-edge" value="snap-edge">
          edge</input></label>
        <label><input type="checkbox" name="snap-vertex" value="snap-vertex">
          vertex</input></label>
        <label><input type="checkbox" name="snap-grid" value="snap-grid">
          grid</input></label>
        <select name="grid-sizes">
          {{#sizeOptions}}
          <option value="{{.}}">{{.}}</option>
          {{/sizeOptions}}
        </select>
      </div>`;
    this.toHtml(template, {
      sizeOptions: this.model.sizeOptions,
    });
    this.updateState();
  }

  update() {
    this.render();
  }

  updateState() {
    this.$el.find('input[name="snap-grid"]').prop('checked', this.model.snapGrid);
    this.$el.find('input[name="snap-vertex"]').prop('checked', this.model.snapVertex);
    this.$el.find('input[name="snap-edge"]').prop('checked', this.model.snapEdge);
    this.$el.find('input[name="snap-surface"]').prop('checked', this.model.snapSurface);
    this.$el.find('select').val(this.model.size);
    this.$el.find('select').prop('disabled', !this.model.snapGrid);
  }

  events() {
    return {
      'change select[name="grid-sizes"]' : 'changeSize',
      'change input[name="snap-grid"]' : 'changeSnapGrid',
      'change input[name="snap-vertex"]' : 'changeSnapVertex',
      'change input[name="snap-edge"]' : 'changeSnapEdge',
      'change input[name="snap-surface"]' : 'changeSnapSurface',
    };
  }

}

module.exports = CPlaneControlsView;
