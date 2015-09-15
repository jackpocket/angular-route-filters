'use strict';

var PubSub = require('../../PubSub/PubSub');
var Route = require('./../Route');
var AsyncSpec = require('jasmine-async')(jasmine);


describe('Route', function () {

  var async = new AsyncSpec(this);

  beforeEach(function () {
    // Hide the annoying Bluebird Rejection Warnings
    window.console.warn = window.log.warn = function () {};
  });

  var route;

  var statebeforeChangeSpy = sinon.spy();
  var destroyStateChangeListener = sinon.spy();

  var mockedState, mockedStateChangeEvent;

  // Mock the angular module app
  angular.module('routeTestApp', ['ui.router', 'ionic'])
      .factory('route', ['$injector', function ($injector) {
        mockedStateChangeEvent = {
          block   : sinon.spy(),
          continue: sinon.spy()
        };

        mockedState = {
          _beforeChangeFns: [],

          beforeChange        : function (cb) {
            this._beforeChangeFns.push(cb);
            statebeforeChangeSpy.apply(this, arguments);

            return destroyStateChangeListener;
          },
          $simulateStateChange: function () {
            for (var i = 0; i < this._beforeChangeFns.length; i++) {
              this._beforeChangeFns[i](mockedStateChangeEvent);
            }
          }
        };

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


  describe('Bootstrap', function () {

    describe('beforeFilter()', function () {

      it('works with services magically injected', function () {
        expect(function () {
          route.beforeFilter('test', function (testService, anotherService) {
            return {
              condition: function () {},
              resolve  : function () {}
            }
          })
        }).not.toThrow();
      });

      it('works with services injected as array annotations', function () {
        expect(function () {
          route.beforeFilter('test', ['testService', 'anotherService', function () {
            return {
              condition: function () {},
              resolve  : function () {}
            }
          }])
        }).not.toThrow();
      });

      it('throws error on undefined service', function () {
        expect(function () {
          route.beforeFilter('test', ['nonExistentService', function () {
            return {
              condition: function () {},
              resolve  : function () {}
            }
          }])
        }).toThrow();
      });

    });


    it('gets a registered BeforeFilter object', function () {
      route.beforeFilter('test', ['testService', function () {
        return {
          condition: function () {},
          resolve  : function () {}
        }
      }]);

      var beforeFilter = route.getBeforeFilterByName('test');

      expect(typeof beforeFilter.condition).toBe('function');
      expect(typeof beforeFilter.resolve).toBe('function');
    });


    it('throws an error when trying to get a non-existent beforeFilter',
        function () {
          expect(function () {
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
        passingSync                  : sinon.spy(),
        passingAsync                 : sinon.spy(),
        anotherPassingSync           : sinon.spy(),
        anotherPassingAsync          : sinon.spy(),
        failingSync                  : sinon.spy(),
        failingAsync                 : sinon.spy(),
        failingAsyncWithSyncError    : sinon.spy(),
        failingFirstResolvedLaterSync: sinon.spy()
      };

      resolutions = {
        failingSync                  : sinon.spy(),
        failingAsync                 : sinon.spy(),
        failingAsyncWithSyncError    : sinon.spy(),
        failingFirstResolvedLaterSync: sinon.spy()
      };

      route.beforeFilter('passingSync', [function () {
        return {
          condition: function () {
            conditions.passingSync();
            return true
          },
          resolve  : function () {}
        }
      }]);

      route.beforeFilter('passingAsync', [function () {
        return {
          condition: function () {
            return new global.Promise(function (resolve) {
              conditions.passingAsync();
              resolve(true);
            });
          },
          resolve  : function () {}
        }
      }]);

      route.beforeFilter('anotherPassingSync', [function () {
        return {
          condition: function () {
            conditions.anotherPassingSync();
            return true
          },
          resolve  : function () {}
        }
      }]);

      route.beforeFilter('anotherPassingAsync', [function () {
        return {
          condition: function () {
            return new global.Promise(function (resolve) {
              conditions.anotherPassingAsync();
              resolve();
            })
          },
          resolve  : function () {}
        }
      }]);

      route.beforeFilter('failingSync', [function () {
        return {
          condition: function () {
            conditions.failingSync();
            return false;
          },
          resolve  : function () {
            resolutions.failingSync();
          }
        }
      }]);

      route.beforeFilter('failingAsync', [function () {
        return {
          condition: function () {
            return new Promise(function (resolve, reject) {
              conditions.failingAsync();
              reject();
            })
          },
          resolve  : function () {
            resolutions.failingAsync();
          }
        }
      }]);

      route.beforeFilter('failingAsyncWithSyncError', [function () {
        return {
          condition: function () {
            return new Promise(function (resolve, reject) {
              conditions.failingAsyncWithSyncError();
              throw new Error('Sync Error');
            })
          },
          resolve  : function () {
            resolutions.failingAsyncWithSyncError();
          }
        }
      }]);

      route.beforeFilter('failingFirstResolvedLaterSync', [function () {
        var condition = false;
        return {
          condition: function () {
            return condition;
          },
          resolve  : function () {
            condition = true;
          }
        }
      }]);

      route.beforeFilter('failingFirstResolvedLaterAsync', [function () {
        var condition = false;
        return {
          condition: function () {
            return new Promise(function (resolve, reject) {
              finalFilter.called = true;

              (condition) ? resolve() : reject();
            })
          },
          resolve  : function () {
            condition = true;
          }
        }
      }]);

      route.beforeFilter('failingAsyncWithSyncErrorInResolution', [function () {
        return {
          condition: function () {
            return new Promise(function (resolve, reject) {
              reject()
            })
          },
          resolve  : function () {
            throw new Error('Sync Error in Resolution');
          }
        }
      }]);

    });


    async.it('checks that all conditions are evaluated IN THE GIVEN ORDER',
        function (done) {
          route.applyBeforeFilters([
            'passingSync',
            'passingAsync',
            'anotherPassingAsync',
            'anotherPassingSync'
          ], mockedStateChangeEvent)
              .then(function () {
                sinon.assert.callOrder(
                    conditions.passingSync,
                    conditions.passingAsync,
                    conditions.anotherPassingAsync,
                    conditions.anotherPassingSync);
              })
              .finally(done);
        });
    //
    async.it('resolves as long as all conditions are passing',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'passingAsync',
            'anotherPassingAsync',
            'anotherPassingSync'
          ], mockedStateChangeEvent)
              .then(spies.resolved, spies.rejected)
              .finally(function () {
                expect(spies.resolved).toHaveBeenCalled();
                expect(spies.rejected).not.toHaveBeenCalled();

                done();
              });
        });

    async.it('rejects as long as one condition is failing - Sync Condition',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'passingAsync',
            'failingSync'
          ], mockedStateChangeEvent)
              .then(spies.resolved, spies.rejected);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again!
            setTimeout(function () {
              expect(spies.resolved).not.toHaveBeenCalled();

              done();
            })
          });
        });

    async.it('rejects and passes the failing BeforeFilter Error - Async Condition',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'failingAsync'
          ], mockedStateChangeEvent)
              .then(spies.resolved, spies.rejected);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again!
            setTimeout(function () {
              expect(spies.resolved).not.toHaveBeenCalled();

              done();
            })
          });
        });

    async.it('rejects and passes the failing BeforeFilter Error - Async Condition Sync Error',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'failingAsyncWithSyncError'
          ], mockedStateChangeEvent)
              .then(spies.resolved);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again!
            setTimeout(function () {
              expect(spies.resolved).not.toHaveBeenCalled();
              done();
            })
          });
        });


    async.it('resolves after failure and later resolution - Sync Condition',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'passingAsync',
            'failingFirstResolvedLaterSync'
          ], mockedStateChangeEvent)
              .then(spies.resolved);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again!
            setTimeout(function () {
              expect(spies.resolved).toHaveBeenCalled();

              done();
            })
          });
        });

    async.it('rejects after failure and later resolution and yet another failure - Sync Conditions',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'failingFirstResolvedLaterSync',
            'failingSync'
          ], mockedStateChangeEvent)
              .then(spies.resolved, spies.rejected);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again, on resolve!
            setTimeout(function () {
              mockedState.$simulateStateChange();

              // Wait for the next condition promise to finalize!
              setTimeout(function () {
                expect(spies.resolved).not.toHaveBeenCalled();

                done();
              });
            })
          });
        });

    async.it('resolves after multiple failures and later resolutions - Sync and Async conditions',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'failingFirstResolvedLaterSync',
            'failingFirstResolvedLaterAsync'
          ], mockedStateChangeEvent)
              .then(spies.resolved, spies.rejected);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again, on resolve!
            setTimeout(function () {
              mockedState.$simulateStateChange();

              // Wait for the next condition promise to finalize!
              setTimeout(function () {
                mockedState.$simulateStateChange();

                expect(spies.resolved).toHaveBeenCalled();

                done();
              });
            })
          });
        });

    async.it('resolves after multiple failures and later resolutions - Sync and Async conditions',
        function (done) {

          route.applyBeforeFilters([
            'passingSync',
            'failingAsyncWithSyncErrorInResolution'
          ], mockedStateChangeEvent)
              .then(spies.resolved, spies.rejected);

          // Wait for the Condition Promise to finalize
          setTimeout(function () {
            mockedState.$simulateStateChange();

            // Wait for the condition promise to finalize again, on resolve!
            setTimeout(function () {

              expect(spies.rejected).toHaveBeenCalled();

              done();
            })
          });
        });

    // catch other errors in resolution

    // make sure the destroy listener is called


    // test authorize

    describe('Authorize', function () {

      // test that a before filters can run as many times as needed on the same
      // state, as long as the condition hasn't been resolved

      async.it('resolves as long as the condition is rejected', function (done) {

        var resolveSpy = sinon.spy();

        var condition = false;
        route.beforeFilter('failingUntilManuallyResolved', [function () {
          return {
            condition: function () {
              return new Promise(function (resolve, reject) {
                (condition) ? resolve() : reject();
              })
            },
            resolve  : resolveSpy
          }
        }]);


        route.authorize({
          data: {
            beforeFilters: ['failingUntilManuallyResolved']
          }
        }, mockedStateChangeEvent);

        // Wait for the Condition Promise to finalize
        setTimeout(function () {
          // Wait for the condition promise to finalize again, on resolve!
          setTimeout(function () {
            route.authorize({
              data: {
                beforeFilters: ['failingUntilManuallyResolved']
              }
            }, mockedStateChangeEvent);

            // Wait for the condition promise to finalize again, on resolve!
            setTimeout(function () {
              // resolve the condition
              //condition = true;

              route.authorize({
                data: {
                  beforeFilters: ['failingUntilManuallyResolved']
                }
              }, mockedStateChangeEvent);

              expect(resolveSpy.callCount).toBe(3);

              done();
            })
          })
        });

      });

      //// test that it doesn't try to reapply the same before filter if its
      //// currently under resolution
      //
      //async.it('resolves as long as the condition is rejected', function (done) {
      //
      //  global.log.info = console.info;
      //  global.log.warn = console.log;
      //
      //  var resolveSpy = sinon.spy();
      //
      //  var condition = false;
      //  route.beforeFilter('failingUntilManuallyResolved', [function () {
      //    return {
      //      condition: function () {
      //        return new Promise(function (resolve, reject) {
      //          (condition) ? resolve() : reject();
      //        })
      //      },
      //      resolve  : resolveSpy
      //    }
      //  }]);
      //
      //
      //  route.authorize({
      //    data: {
      //      beforeFilters: ['failingUntilManuallyResolved']
      //    }
      //  }, mockedStateChangeEvent);
      //
      //  // Wait for the Condition Promise to finalize
      //  setTimeout(function () {
      //    // Wait for the condition promise to finalize again, on resolve!
      //    setTimeout(function () {
      //      route.authorize({
      //        data: {
      //          beforeFilters: ['failingUntilManuallyResolved']
      //        }
      //      }, mockedStateChangeEvent);
      //
      //      // Wait for the condition promise to finalize again, on resolve!
      //      setTimeout(function () {
      //        // resolve the condition
      //        //condition = true;
      //
      //        route.authorize({
      //          data: {
      //            beforeFilters: ['failingUntilManuallyResolved']
      //          }
      //        }, mockedStateChangeEvent);
      //
      //        expect(resolveSpy.callCount).toBe(3);
      //
      //        global.log.info = function () {};
      //        global.log.warn = function () {};
      //
      //        done();
      //      })
      //    })
      //  });
      //
      //});

      // test that if 2 states have the same beforeFilter, and the previous one
      // has been invoked but never resolved, when the 2nd one is invoked, at the
      // resolution, it continues with the 2nd state not the 1st.
      // (Basically, the 1st beforeFilter is forgotten)

      // test that any other beforeFilters are still working even though there
      // is a before filter under reoslution

    });

  });


});
