'use strict';

const chai = require('chai');
const assert = chai.assert;

const trip = require('../..');
const joi = trip.joi;
const JoiModel = trip.JoiModel;

describe('Joi Model', () => {

  it('enforces a schema', () => {
    const schema = joi.object().keys({
      foo: joi.number().integer(),
      bar: joi.string().required(),
    });

    assert.throws(() => {
      new JoiModel(schema, {});
    }, 'ValidationError: child "bar" fails because ["bar" is required]');

    assert.throws(() => {
      new JoiModel(schema, {foo: 'a', bar: 1});
    }, 'ValidationError: child "foo" fails because ["foo" must be a number]');

    assert.throws(() => {
      const m = new JoiModel(schema, {foo: 1, bar: 'f24'});
      m.foo = 't';
    }, 'ValidationError: child "foo" fails because ["foo" must be a number]');
  });

  it('emits changes', () => {
    const schema = joi.object().keys({
      foo: joi.number().integer(),
      bar: joi.string().required(),
    });

    const m = new JoiModel(schema, {foo: 1, bar: 'f24'});
    m.on('change', (k, v) => {
      assert.equal(k, 'foo');
      assert.equal(v, 2);
    });
    m.foo = 2;
  });

});
