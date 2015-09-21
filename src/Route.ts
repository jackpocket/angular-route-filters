/// <reference path="./basic.d.ts" />
'use strict';


module RouteFilters {

  export class Route {

    private _beforeFilters: Basic.IHashMap<IBeforeFilter> = {};

    //private _currentlyResolving: Basic.IHashMap<IBeforeFilter> = {};

    private _preventedRoutes: Basic.IHashMap<IRouteDataStructure> = {};

    private _authorizationProcesses = {};

    private _temporaryAuthorizations = {};

    constructor(private _$injector, private _$rootScope, private _$state) {
      // just for debugging
      _$rootScope.preventedRoutes = this._preventedRoutes;
    }

    public authorize(route, event) {
      if (this._isTarget(route) && !this._hasOneTimeAuthorization(route)) {
        event.preventDefault();

        this._isAuthorized(route)
            .then((acc) => {
              console.log('is authorized', acc);

              this._offerOneTimeAuthorization(route);

              this._$state.transitionTo(route.name, route.params);

              this._destroyAuthorizationProcessFor(route);
            }, (e) => {
              console.warn('not authorized', e);

              this._createAuthorizationProcessFor(route)
                  .authorize()
                  .then(() => {
                    this._$state.transitionTo(route.name, route.params);
                  });
            });
      }

    }

    private _createAuthorizationProcessFor(target: IRouteDataStructure) {
      this._authorizationProcesses[target.name] =
          new AuthorizationProcess(this._getBeforeFiltersFrom(target));

      return this._authorizationProcesses[target.name];
    }

    private _destroyAuthorizationProcessFor(target: IRouteDataStructure): void {
      if (this._authorizationProcesses[target.name]) {
        delete this._authorizationProcesses[target.name];
      }
    }

    private _hasOneTimeAuthorization(route) {
      var val = !!this._temporaryAuthorizations[route.name];
      delete this._temporaryAuthorizations[route.name];
      return val;
    }

    private _offerOneTimeAuthorization(route) {
      this._temporaryAuthorizations[route.name] = true;
    }

    private _isTarget(route) {
      return Route._getBeforeFilterNamesFrom(route).length > 0;
    }


    private _isAuthorized(route): PromisesAPlus.Thenable<boolean> {
      console.debug('> _isAuthroized');
      var conditions = Array.prototype.map.call(this._getBeforeFiltersFrom(route), (filter) => {
        return filter.condition();
      });

      var r = global.Promise.all(conditions);
      console.debug('< _isAuthroized');

      return r;
    }

    private _getBeforeFiltersFrom(route: IRouteDataStructure) {
      return Array.prototype.map.call(Route._getBeforeFilterNamesFrom(route),
          (n) => this.getBeforeFilterByName(n));
    }

    private static _getBeforeFilterNamesFrom(route): [string] {
      return (route.data || {}).beforeFilters || [];
    }

    private _isPrevented(route: IRouteDataStructure): boolean {
      return !!this._preventedRoutes[route.name];
    }

    public beforeFilter(name: string, toProvide: [string, () => any]) {
      var self = this;

      this._beforeFilters[name] = new BeforeFilter(
          name,
          this._$injector.invoke(toProvide),
          (cb) => this._$rootScope.$on('$stateChangeStart',
              (event, toState, toParams) => {

                if (this._isPrevented(toState)) {
                  console.info(`Refresh prevented in CB for:`, toState.name);
                  return;
                }

                cb({
                  _blocked: {},
                  block:    function () {
                    console.log('BeforeFilter event blocked CB', this._blocked);

                    event.preventDefault();
                    self._preventedRoutes[toState.name] = toState;

                    this._blocked = {
                      name:   toState.name,
                      params: toParams
                    }
                  },
                  continue: function () {
                    console.log('BeforeFilter event continued CB', this._blocked);
                    if (this._blocked.name) {

                      self._$rootScope.$state
                          .transitionTo(this._blocked.name, this._blocked.params);

                      this.destroy();
                      this._blocked = {};
                    }
                  },
                  destroy:  function () {
                    delete self._preventedRoutes[this._blocked.name];
                  }
                });
              }));
    }

    public getBeforeFilterByName(name: string): IBeforeFilter {
      if (this._beforeFilters[name]) {
        return this._beforeFilters[name];
      }

      throw new Error(`Route.getBeforeFilterByName:` +
          `A BeforeFilter with the name "${name}" doesn't exist!`);
    }

    // I think there is a need for AfterFilters as well
    // They will be the ones that catch speicific errors during the current oute
    // One example, is the 401 Authorization Code issue, coming from the server
    // on the Drawing Entries page for ex.

    // That could of course be more generalized, but I think there are some
    // other cases
  }
}
