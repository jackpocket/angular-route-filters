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
    .controller('HomeUserCtrl', ['$scope', function ($scope) {
      // nothing interesting happening here yet
    }])
    .controller('LoginCtrl', [
      '$scope',
      '$rootScope',
      '$state',
      function ($scope, $rootScope, $state) {
        $scope.login = function () {
          // simulate a real asyn login
          setTimeout(function () {
            console.log('loging in');


            $rootScope.user = {
              name: 'Gabriel Troia'
            };

            // Note, that is going home - to the guest user.
            $state.go('home');
          }, 2000);
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

    }])

  // Set up the Authorization Bindings
    .run([
      '$rootScope',
      'route',
      function ($rootScope, route) {

        $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
          route.authorize(toState, {
            _blocked: {},
            block   : function () {
              event.preventDefault();

              this._blocked = {
                name  : toState,
                params: toParams
              }
            },
            continue: function () {
              if (typeof this._blocked.name === 'string') {
                console.log('transitioning to ', this._blocked)

                $rootScope.$state
                    .transitionTo(this._blocked.name, this._blocked.params);

                this._blocked = {};
              }
            }
          });

          // clean the args? lie so: event = null; toState: null, toParams: null
          // because this will keep it alive, thus setting a good env for
          // memory leaking
        });

      }]);

