'use strict';

const lib = require('../../../../..');
const AnnotationView = lib.AnnotationView;

class CornerAnnotationView extends AnnotationView {

  constructor(model, threeJSScene, position) {
    super(model, threeJSScene, position);
  }

  render() {
    super.render();
    var template = `
        <div class="corner">
          <span class="x">{{x}}</span>
          <span class="y">{{y}}</span>
          <span class="z">{{z}}</span>
        </div>`;
    var view = this.position;
    this.toHtml(template, view);
  }

}

module.exports = CornerAnnotationView;
