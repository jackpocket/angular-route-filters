/// <reference path="../src/Route" />
'use strict';

module RouteFilters {

  describe('Route', function () {

    var route;

    var mockedState, mockedStateChangeEvent;

    // Mock the angular module app
    angular.module('routeTestApp', ['ui.router'])
        .factory('route', ['$injector', function ($injector) {
          return new Route($injector, mockedState);
        }])

        .service('testService', function () {
          //
        })
        .service('anotherService', function () {
          // 'just a service'
        });

    beforeEach(angular.mock.module('routeTestApp'));

    beforeEach(angular.mock.inject(['route', function (_route) {
      route = _route;
    }]));


    describe('Bootstrap', () => {

      describe('beforeFilter()', () => {

        it('works with services magically injected', () => {
          expect(() => {
            route.beforeFilter('test', (testService, anotherService) => {
              return {
                condition:  () => {},
                resolution: () => {}
              }
            })
          }).not.toThrow();
        });


        it('works with services injected as array annotations', () => {
          expect(() => {
            route.beforeFilter('test', ['testService', 'anotherService',
              () => {
                return {
                  condition:  () => {},
                  resolution: () => {}
                }
              }])
          }).not.toThrow();
        });

      });

      it('throws error on undefined service', () => {
        expect(() => {
          route.beforeFilter('test', ['nonExistentService', () => {
            return {
              condition:  () => {},
              resolution: () => {}
            }
          }])
        }).toThrow();
      });


      it('gets a registered BeforeFilter object', () => {
        route.beforeFilter('test', ['testService', () => {
          return {
            condition:  () => {},
            resolution: () => {}
          }
        }]);

        var beforeFilter = route.getBeforeFilterByName('test');

        expect(typeof beforeFilter.evaluateCondition).toBe('function');
        expect(typeof beforeFilter.startResolutionProcess).toBe('function');
      });


      it('throws an error when trying to get a non-existent beforeFilter', () => {
        expect(() => {
          route.getBeforeFilterByName('noFilter')
        }).toThrow(new Error('Route.getBeforeFilterByName:' +
            'A BeforeFilter with the name "noFilter" doesn\'t exist!'));
      });

    });


    describe('ApplyBeforeFilter', function () {
      var spies, conditions, resolutions;

      var finalFilter = {
        called: false
      };

      beforeEach(function () {

        spies = {
          resolved: sinon.spy(),
          rejected: sinon.spy()
        };

        conditions = {
          passingSync:                   sinon.spy(),
          passingAsync:                  sinon.spy(),
          anotherPassingSync:            sinon.spy(),
          anotherPassingAsync:           sinon.spy(),
          failingSync:                   sinon.spy(),
          failingAsync:                  sinon.spy(),
          failingAsyncWithSyncError:     sinon.spy(),
          failingFirstResolvedLaterSync: sinon.spy()
        };

        resolutions = {
          failingSync:                   sinon.spy(),
          failingAsync:                  sinon.spy(),
          failingAsyncWithSyncError:     sinon.spy(),
          failingFirstResolvedLaterSync: sinon.spy()
        };

        route.beforeFilter('passingSync', [() => {
          return {
            condition:  () => {
              conditions.passingSync();
              return true;
            },
            resolution: () => {}
          }
        }]);

        console.log(route.getBeforeFilterByName('passingSync'))

        route.beforeFilter('passingAsync', [function () {
          return {
            condition:  () => new Promise((resolve) => {
              conditions.passingAsync();
              resolve(true);
            }),
            resolution: function () {}
          }
        }]);

        route.beforeFilter('anotherPassingSync', [function () {
          return {
            condition:  function () {
              conditions.anotherPassingSync();
              return true
            },
            resolution: function () {}
          }
        }]);

        route.beforeFilter('anotherPassingAsync', [function () {
          return {
            condition:  function () {
              return new global.Promise(function (resolve) {
                conditions.anotherPassingAsync();
                resolve();
              })
            },
            resolution: function () {}
          }
        }]);

        route.beforeFilter('failingSync', [function () {
          return {
            condition:  function () {
              conditions.failingSync();
              return false;
            },
            resolution: function () {
              resolutions.failingSync();
            }
          }
        }]);

        route.beforeFilter('failingAsync', [function () {
          return {
            condition:  function () {
              return new Promise(function (resolve, reject) {
                conditions.failingAsync();
                reject();
              })
            },
            resolution: function () {
              resolutions.failingAsync();
            }
          }
        }]);

        route.beforeFilter('failingAsyncWithSyncError', [function () {
          return {
            condition:  function () {
              return new Promise(function (resolve, reject) {
                conditions.failingAsyncWithSyncError();
                throw new Error('Sync Error');
              })
            },
            resolution: function () {
              resolutions.failingAsyncWithSyncError();
            }
          }
        }]);

        route.beforeFilter('failingFirstResolvedLaterSync', [function () {
          var condition = false;
          return {
            condition:  function () {
              return condition;
            },
            resolution: function () {
              condition = true;
            }
          }
        }]);

        route.beforeFilter('failingFirstResolvedLaterAsync', [function () {
          var condition = false;
          return {
            condition:  function () {
              return new Promise(function (resolve, reject) {
                finalFilter.called = true;

                (condition) ? resolve() : reject();
              })
            },
            resolution: function () {
              condition = true;
            }
          }
        }]);

        route.beforeFilter('failingAsyncWithSyncErrorInResolution', [function () {
          return {
            condition:  function () {
              return new Promise(function (resolve, reject) {
                reject()
              })
            },
            resolution: function () {
              throw new Error('Sync Error in Resolution');
            }
          }
        }]);

      });


      it('checks that all conditions are evaluated IN THE GIVEN ORDER', (done) => {
        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'passingAsync',
          'anotherPassingAsync',
          'anotherPassingSync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route.authorize(beforeFilters)
            .then(() => {
              sinon.assert.callOrder(
                  conditions.passingSync,
                  conditions.passingAsync,
                  conditions.anotherPassingAsync,
                  conditions.anotherPassingSync);
            })
            .then(done);
      });

      it('resolves as long as all conditions are passing', (done) => {
        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'passingAsync',
          'anotherPassingAsync',
          'anotherPassingSync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route
            .authorize(beforeFilters)
            .then(spies.resolved, spies.rejected)
            .then(() => {
              expect(spies.resolved).toHaveBeenCalled();

              done();
            });
      });


      it('rejects as long as one condition is failing - Sync Condition', (done) => {
        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'passingAsync',
          'failingSync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route
            .authorize(beforeFilters)
            .then(null, spies.rejected)
            .then(() => {
              expect(spies.rejected).toHaveBeenCalled();

              done();
            });
      });


      it('rejects and passes the failing BeforeFilter Error - Async Condition', (done) => {
        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'failingAsync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route
            .authorize(beforeFilters)
            .then(null, spies.rejected)
            .then(() => {
              expect(spies.rejected).toHaveBeenCalled();

              done();
            })
      });


      it('resolves after failure and later resolution - Sync Condition', (done) => {
        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'passingAsync',
          'failingFirstResolvedLaterSync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route
            .authorize(beforeFilters)
            .then(spies.resolved, spies.rejected)
          // now that the condition passes, authorize again
            .then(() => route.authorize(beforeFilters))
            .then(spies.resolved)
            .then(() => {
              sinon.assert.callOrder(
                  spies.rejected,
                  spies.resolved);

              expect(spies.resolved.callCount).toBe(1)
              ;
              done();
            });
      });


      it('rejects after failure and later resolution and yet another failure - Sync Conditions', (done) => {

        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'failingFirstResolvedLaterSync',
          'failingSync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route
            .authorize(beforeFilters)
            .then(spies.resolved, spies.rejected)
          // now that the condition passes, authorize again
            .then(() => route.authorize(beforeFilters))
            .then(spies.resolved, spies.rejected)
            .then(() => {
              sinon.assert.callOrder(
                  spies.rejected,
                  spies.rejected);

              expect(spies.resolved).not.toHaveBeenCalled();

              done();
            });
      });


      it('resolves after multiple failures and later resolutions - Sync and Async conditions', (done) => {

        let beforeFilters = Array.prototype.map.call([
          'passingSync',
          'failingFirstResolvedLaterSync',
          'failingFirstResolvedLaterAsync'
        ], (bfName) => route.getBeforeFilterByName(bfName));

        route
            .authorize(beforeFilters)
            .then(spies.resolved, spies.rejected)
          // now that the condition passes, authorize again
            .then(() => route.authorize(beforeFilters))
            .then(spies.resolved, spies.rejected)
          // now that the condition passes, authorize again
            .then(() => route.authorize(beforeFilters))
            .then(spies.resolved, spies.rejected)
          // now that the condition passes, authorize again
            .then(() => route.authorize(beforeFilters))
            .then(() => {
              sinon.assert.callOrder(
                  spies.rejected,
                  spies.rejected,
                  spies.resolved);

              expect(spies.resolved.callCount).toBe(1);

              done();
            });
      });

    });

  });

}
