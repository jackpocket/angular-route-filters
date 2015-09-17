/// <reference path="./BeforeFilter" />
/// <reference path="./Route" />
/// <reference path="./History" />
/// <reference path="./AuthorizationProcess" />
/// <reference path="./interfaces" />

var global: any = window;
var routeFilters = RouteFilters;

angular.module('routeFilters', [
  'ui.router'
])
    .service('route', ['$injector', '$rootScope', '$state', routeFilters.Route])

  // Set up the Authorization Bindings
    .run([
      '$rootScope',
      'route',
      function ($rootScope, route) {

        // make sure this happens only if there are beforeFilters binded.

        // Before Filters
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState) {
          //console.log('----------- state change attempt to:', toState.name);
          //console.log('event prevented default', event.defaultPrevented);
          //console.log('event', event);
          //console.log('');
          route.authorize(toState, event);

          //route.authorize(toState, {
          //  _blocked: {},
          //  block:    function () {
          //    event.preventDefault();
          //
          //    this._blocked = {
          //      name:   toState,
          //      params: toParams
          //    }
          //  },
          //  continue: function () {
          //    //if (typeof this._blocked.name === 'string') {
          //    $rootScope.$state
          //        .transitionTo(this._blocked.name, this._blocked.params);
          //
          //    this._blocked = {};
          //    //}
          //  }
          //});

          // clean the args? lie so: event = null; toState: null, toParams: null
          // because this will keep it alive, thus setting a good env for
          // memory leaking
        });

        // after filters
        // this type of filters are working on $stateChangeEnd

      }]);
