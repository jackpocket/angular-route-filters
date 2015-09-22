'use strict';

var oldLogInfo = console.info;
console.info = function () {
  //oldLogInfo.apply(oldLogInfo, arguments);
  console.trace.apply(console, arguments);
};

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ui.router',
  'jp.routeFilters'
])
    .run([
      '$rootScope',
      '$state',
      '$stateParams',
      'routeFilters',
      function ($rootScope, $state, $stateParams, route) {

        $rootScope.history = [];

        $rootScope.goBack = function () {
          var prev = $rootScope.history.pop();

          if (prev) {
            console.debug('going back to', prev);
            $state.go(prev);
          }
        };

        $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
          if (fromState.name) {
            $rootScope.history.push(fromState.name);
          }
        });

        $rootScope.getIntended = function () {
          return route.getIntended();
        };

        $rootScope.user = null;


        // It's very handy to add references to $state and $stateParams to the $rootScope
        // so that you can access them from any scope within your applications.For example,
        // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
        // to active whenever 'contacts.list' or one of its decendents is active.
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
      }
    ]
)
  //.controller('AppCtrl', [
  //  '$state',
  //  function ($state) {
  //    $state.go('home-guest');
  //    // nothing interesting happening here yet
  //  }])
    .controller('HomeGuestCtrl', ['$scope', function ($scope) {
      // nothing interesting happening here yet
    }])
    .controller('HomeUserCtrl', [
      '$scope',
      '$rootScope',
      '$state',
      function ($scope, $rootScope, $state) {
        $scope.logout = function () {
          // simulate a real asyn login
          setTimeout(function () {
            $rootScope.user = null;

            // Note, that is going home - to the guest user.
            $state.go('home-guest');
          }, 100);
        };
      }])
    .controller('LoginCtrl', [
      '$scope',
      '$rootScope',
      '$state',
      'routeFilters',
      function ($scope, $rootScope, $state, route) {
        $scope.login = function () {
          // simulate a real asyn login
          setTimeout(function () {
            $rootScope.user = {
              name: 'Gabriel Troia'
            };

            // Note, that is NOT going 'home', but to to the guest user.
            route.goToIntendedOr('home-guest');
          }, 100);
        };


        $scope.verifyPhone = function () {
          // simulate a real asyn login
          setTimeout(function () {
            $rootScope.user.phoneVerified = true;

            // Note, that is NOT going 'home', but to to the guest user.
            route.goToIntendedOr('home-guest');
          }, 100);
        };

        $scope.verifyAge = function () {
          // simulate a real asyn login
          setTimeout(function () {
            $rootScope.user.ageVerified = true;

            // Note, that is NOT going 'home', but to to the guest user.
            route.goToIntendedOr('home-guest');
          }, 100);
        };

        // nothing interesting happening here yet
      }])
    .config([
      '$stateProvider',
      '$urlRouterProvider',
      function ($stateProvider, $urlRouterProvider) {

        //$urlRouterProvider.otherwise(function($injector) {
        //  $injector.invoke([ '$state', function( $state ) {
        //    $state.go( 'home-guest');
        //  }]);
        //});

        // Use $urlRouterProvider to configure any redirects (when) and invalid urls (otherwise).
        //$urlRouterProvider
        //
        //  // The `when` method says if the url is ever the 1st param, then redirect to the 2nd param
        //  // Here we are just setting up some convenience urls.
        //    .when('/c?id', '/contacts/:id')
        //    .when('/user/:id', '/contacts/:id')

        // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
        $urlRouterProvider.otherwise('/home/guest');

        $stateProvider
            .state('home-guest', {
              url        : '/home/guest',
              controller : 'HomeGuestCtrl',
              templateUrl: './views/home-guest.html',
            })
            .state('home-user', {
              url        : '/user/home',
              controller : 'HomeUserCtrl',
              templateUrl: './views/home-user.html',
              resolve    : {
                someData: [function () {
                  console.log('ctrl resolving "someData - this should wait for the $$beforeFitlers"', arguments);

                  return new Promise(function (resolve, reject) {
                    setTimeout(function () {
                      resolve({
                        data: 'just some random data'
                      });
                    }, 200)
                  });
                }],
                someOtherData: function () {
                  console.log('ctrl resolving "someRandomData - this should wait for the $$beforeFitlers"', arguments);

                  return new Promise(function (resolve, reject) {
                    setTimeout(function () {
                      resolve({
                        data: 'just some other random data'
                      });
                    }, 200)
                  });
                }
              },
              params     : {
                asd: true
              },
              data       : {
                beforeFilters: [
                  'user',
                  'user:phoneVerified',
                  'user:ageVerified'
                ]
              }
            })
            .state('login-step1', {
              url        : '/login-step1',
              templateUrl: './views/login-step1.html',
              resolve    : {}
            })
            .state('login-step2', {
              url        : '/login-step2',
              templateUrl: './views/login-step2.html',
              resolve    : {}
            })
            .state('login-step3', {
              url        : '/login-step3',
              controller : 'LoginCtrl',
              templateUrl: './views/login-step3.html',
              resolve    : {}
            })
            .state('verify-phone', {
              url        : '/verify-phone',
              controller : 'LoginCtrl',
              templateUrl: './views/verify-phone.html',
              resolve    : {}
            })
            .state('verify-age', {
              url        : '/verify-age',
              controller : 'LoginCtrl',
              templateUrl: './views/verify-age.html',
              resolve    : {}
            });
      }])

    .run(['routeFilters', function (route) {

      route.beforeFilter('user', [
        '$rootScope',
        '$state',
        function ($rootScope, $state) {
          return {
            condition : function () {
              return new Promise(function (resolve, reject) {
                setTimeout(function () {
                  if (!!($rootScope.user && $rootScope.user.hasOwnProperty('name'))) {
                    resolve()
                  } else {
                    reject();
                  }
                }, 1000);
              })
            },
            resolution: function () {
              console.log('resolving user in implementation');
              if (confirm('User Fitler failed. Continue?')) {
                $state.go('login-step1');
              }
            }
          }
        }
      ]);

      route.beforeFilter('user:phoneVerified', [
        '$rootScope',
        '$state',
        function ($rootScope, $state) {
          return {
            condition : function () {
              return !!($rootScope.user && $rootScope.user.phoneVerified === true);
            },
            resolution: function () {
              //if (confirm('User:phoneVerified Filter failed. Continue?')) {
              $state.go('verify-phone');
              //}
            }
          }
        }
      ]);

      route.beforeFilter('user:ageVerified', [
        '$rootScope',
        '$state',
        function ($rootScope, $state) {
          return {
            condition : function () {
              return !!($rootScope.user && $rootScope.user.ageVerified === true);
            },
            resolution: function () {
              //if (confirm('User:ageVerified Filter failed. Continue?')) {
              $state.go('verify-age');
              //}
            }
          }
        }
      ]);

    }]);
