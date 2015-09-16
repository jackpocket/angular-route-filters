'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ui.router',
  'routeFilters'
])
    .run([
      '$rootScope',
      '$state',
      '$stateParams',
      function ($rootScope, $state, $stateParams) {

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
          $state.go('home');
        }, 100);
      };
    }])
    .controller('LoginCtrl', [
      '$scope',
      '$rootScope',
      '$state',
      function ($scope, $rootScope, $state) {
        $scope.login = function () {
          // simulate a real asyn login
          setTimeout(function () {
            $rootScope.user = {
              name: 'Gabriel Troia'
            };

            // Note, that is NOT going 'home', but to to the guest user.
            $state.go('home');
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
        $urlRouterProvider.otherwise('/home');

        $stateProvider
            .state('home', {
              url        : '/home',
              controller : 'HomeGuestCtrl',
              templateUrl: './views/home-guest.html',
              resolve    : {}
            })
            .state('home-user', {
              url        : '/user/home',
              controller : 'HomeUserCtrl',
              templateUrl: './views/home-user.html',
              resolve    : {},
              data       : {
                beforeFilters: [
                  'user'
                ]
              }
            })
            .state('login', {
              url        : '/login',
              controller : 'LoginCtrl',
              templateUrl: './views/login.html',
              resolve    : {}
            });
      }])

    .run(['route', function (route) {

      route.beforeFilter('user', [
        '$rootScope',
        '$state',
        function ($rootScope, $state) {
          return {
            condition: function () {
              return !!($rootScope.user && $rootScope.user.hasOwnProperty('name'));
            },
            resolve  : function () {
              $state.go('login');
            }
          }
        }
      ]);

    }]);
