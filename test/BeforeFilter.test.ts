/// <reference path="../src/BeforeFilter" />
/// <reference path="../src/interfaces" />
'use strict';

var global: any = window;

module RouteFilters {

  describe('BeforeFilter', function () {

    var conditionSpy, resolutionSpy;
    var testBeforeFilter;

    beforeEach(function () {
      // Hide the annoying Bluebird Rejection Warnings
      window.console.warn = function () {};
    });


    beforeEach(function () {
      conditionSpy = sinon.spy();
      resolutionSpy = sinon.spy();

      var definition = {
        condition:  function () {
          conditionSpy();
          return false;
        },
        resolution: resolutionSpy
      };

      testBeforeFilter = new BeforeFilter('test', definition);
    });


    it('evaluates the condition', function () {
      testBeforeFilter.evaluateCondition();

      expect(conditionSpy).toHaveBeenCalled();
    });


    it('evaluates the resolve', function () {
      testBeforeFilter.startResolutionProcess();

      expect(resolutionSpy).toHaveBeenCalled();
    });


    it('works with condition as a promise', function () {

      var testBeforeFilter = new BeforeFilter('testWithPromise', {
        condition:  () => Promise.reject('just because'),
        resolution: resolutionSpy
      });

      testBeforeFilter.startResolutionProcess();

      expect(resolutionSpy).toHaveBeenCalled();
    });


    it('passes the right beforeFilter when a condition is not met',
        function (done) {
          var testBeforeFilter = new BeforeFilter('conditionNotPassing', {
            condition:  () => false,
            resolution: () => 'I am the right Filter!'
          });

          testBeforeFilter.evaluateCondition()
              .then(null, (beforeFilter) => {
                expect(beforeFilter._name).toBe('conditionNotPassing');
                done();
              });
        });


    it('passes the filterScope placeholder in resolve method', (done) => {
      var testBeforeFilter = new BeforeFilter('conditionWithFilterScope', {
        condition:  (filterScope: any) => {
          filterScope.test = 'is working';
          return false;
        },
        resolution: (filterScope: any) => {
          expect(filterScope.test).toBe('is working');

          done();
        }
      });

      testBeforeFilter.evaluateCondition();
      testBeforeFilter.startResolutionProcess();
    });

  });

}
