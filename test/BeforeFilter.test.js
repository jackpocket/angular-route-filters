'use strict';

var sinon = require('sinon');
require('jasmine-sinon');
var BeforeFilter = require('../BeforeFilter');
var AsyncSpec = require('jasmine-async')(jasmine);

describe('BeforeFilter', function () {

  var async = new AsyncSpec(this);

  var conditionSpy, resolveSpy, eventBlockSpy, eventContinueSpy;

  var statebeforeChangeSpy = sinon.spy();
  var testBeforeFilter;
  var mockedState;

  beforeEach(function () {
    // Hide the annoying Bluebird Rejection Warnings
    window.console.warn = function () {};
  });

  beforeEach(function () {
    conditionSpy = sinon.spy();
    resolveSpy = sinon.spy();
    eventBlockSpy = sinon.spy();
    eventContinueSpy = sinon.spy();

    mockedState = {
      beforeChange        : function (cb) {
        this._beforeChangeFn = cb;
        statebeforeChangeSpy.apply(this, arguments);
      },
      $simulateStateChange: function () {
        this._beforeChangeFn && this._beforeChangeFn();
      }
    };

    var definition = {
      condition: function () {
        conditionSpy();
        return false;
      },
      resolve  : resolveSpy
    };

    testBeforeFilter = new BeforeFilter('test', definition, mockedState);
  });

  it('evaluates the condition', function () {
    testBeforeFilter.condition();

    expect(conditionSpy).toHaveBeenCalled();
  });

  it('evaluates the resolve', function () {
    testBeforeFilter.resolve();

    expect(resolveSpy).toHaveBeenCalled();
  });

  it('listens for state before state change on resolve', function () {
    testBeforeFilter.resolve();

    expect(statebeforeChangeSpy).toHaveBeenCalled();
  });

  it('works with condition as a promise', function () {

    var testBeforeFilter = new BeforeFilter('testWithPromise', {
      condition: function () {
        return new Promise(function (resolve, reject) {
          reject();
        });
      },
      resolve  : resolveSpy
    });

    testBeforeFilter.resolve();

    expect(resolveSpy).toHaveBeenCalled();

  });

  async.it('passes the right beforeFilter when a condition is not met',
      function (done) {
        var testBeforeFilter = new BeforeFilter('conditionNotPassing', {
          condition: function () {
            return false;
          },
          resolve  : function () {
            return 'I am the right Filter!';
          }
        });

        testBeforeFilter.condition()
            .then(null, function (beforeFilter) {
              expect(beforeFilter._name).toBe('conditionNotPassing');
              done();
            });
      });

  async.it('passes the filterScope placeholder in condition', function (done) {
    var testBeforeFilter = new BeforeFilter('conditionWithFilterScope', {
      condition: function (filterScope) {
        expect(typeof filterScope).toBe('object');

        done();

        return false;
      },
      resolve: function() {
        return 'great';
      }
    });

    testBeforeFilter.condition();
  });

  async.it('passes the filterScope placeholder in resolve method', function (done) {
    var testBeforeFilter = new BeforeFilter('conditionWithFilterScope', {
      condition: function (filterScope) {
        filterScope.test = 'is working';
        return false;
      },
      resolve  : function (filterScope) {
        expect(filterScope.test).toBe('is working');

        done();
      }
    });

    testBeforeFilter.condition();
    testBeforeFilter.resolve();
  });

});
