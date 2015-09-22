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
          let beforeFilterNames = helper.getBeforeFilterNames(state);

          if (beforeFilterNames.length > 0) {
            state.resolve = state.resolve || {};

            // If there are any other dependencies to resolve
            // inject the $$beforeFilters 'service' to their dependencies
            // in the last position (so it doesn't affect the arguments list)
            // This will create a chain of dependencies, and it will force
            // the rest of them to wait until $$beforeFilters is resolved,
            // and is needed because by default resolve runs all the 'services'
            // in parallel.
            // This ensures no extra computations or API calls are created
            // if the $$beforeFilters are not resolved.
            if (_.keys(state.resolve).length > 0) {
              _.map(state.resolve, (dp: any) => {
                if (_.isArray(dp)) {
                  let fn = dp.pop();
                  dp.push('$$beforeFilters');
                  dp.push(fn);
                }
                else if (typeof dp === 'function') {
                  dp.$inject = dp.$inject || [];
                  dp.$inject.push('$$beforeFilters');
                }
              });
            }


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
