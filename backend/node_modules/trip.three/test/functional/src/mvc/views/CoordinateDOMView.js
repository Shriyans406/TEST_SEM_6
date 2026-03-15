'use strict';

const tripdom = require('trip.dom');
const Text = tripdom.Text;

class CoordinateDOMView extends tripdom.View {

  constructor(model, scene, options) {
    options = options || {};
    options.class = 'coordinate';
    options.tag = 'tr';
    super(model, scene, options);
    this.label = options.label;
    this.field = options.field;
  }

  render() {
    super.render();
    let template = `
      <td class="label">{{label}}</td>
      <td class="x">{{{x}}}</td>
      <td class="y">{{{y}}}</td>
      <td class="z">{{{z}}}</td>
      `;
    let view = {
      label: this.label,
      x: new Text(this.model, this.field + 'X'),
      y: new Text(this.model, this.field + 'Y'),
      z: new Text(this.model, this.field + 'Z'),
    };
    this.toHtml(template, view);
  }

  update() {
    // do nothing
  }

}

module.exports = CoordinateDOMView;
