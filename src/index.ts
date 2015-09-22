/// <reference path="./BeforeFilter" />
/// <reference path="./Route" />
/// <reference path="./interfaces" />

var global: any = window;
var routeFilters = RouteFilters;

angular.module('jp.routeFilters', [
  'ui.router'
])
    .service('routeFilters', ['$injector', '$state', routeFilters.Route])
    .factory('jp.routeFilters._helper', ['$state', ($state) => ({
      getStates: () => _.filter($state.get(), (state: any) => !state.abstract),

      getBeforeFilterNames: (state) => (state.data || {}).beforeFilters || [],
    })])

  // Set up the Authorization Bindings
    .run([
      '$rootScope',
      'routeFilters',
      'jp.routeFilters._helper',
      function ($rootScope, route, helper) {

        _.map(helper.getStates(), (state: any) => {
          state.resolve = state.resolve || {};

          let beforeFilterNames = helper.getBeforeFilterNames(state);

          if (beforeFilterNames.length > 0) {
            state.resolve['$$beforeFilters'] = [
              '$stateParams',
              ($stateParams) => {
                let beforeFilters = _.map(beforeFilterNames, (bfName) => {
                  return route.getBeforeFilterByName(bfName);
                });

                return route
                    .authorize(beforeFilters)
                    .then(null, (e) => {
                      // It seems like the Authorization failed.
                      // The resolution process already started, so let's
                      // set the intended state to this state, so the developer
                      // can come back to it once the condition is resolve,
                      // just by calling route.goToIntendedOr();
                      // TODO; this can be problemaitic in the future - b/c
                      // currently there is no way to determine that the
                      // the resokutino process actually started something.
                      route.setIntended(state.name, $stateParams);

                      throw e;
                    });
              }];
          }
        });

        // after filters
        // this type of filters are working on $stateChangeEnd

      }
    ]);
