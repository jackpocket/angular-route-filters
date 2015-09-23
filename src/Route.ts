/// <reference path="./basic.d.ts" />
'use strict';


module RouteFilters {

  export class Route {

    private _beforeFilters: Basic.IHashMap<IBeforeFilter> = {};

    private _intendedRoute: {name: string, params: any};


    constructor(private _$injector, private _$state) {}

    /**
     * Apply the Given before filters
     * If any of the filter condition fails, the resolution for the given
     *  beforeFilter will be called, and once resolved the method will
     * recursively be called again with the rest of the unevaluated
     * beforeFilters.
     *
     * @param beforeFilters
     * @returns {any}
     */
    public authorize(beforeFilters: Array<BeforeFilter>) {
      // If there are no beforeFilters given resolve it right.
      // This is the exit from the recursive call.
      if (beforeFilters.length === 0) {
        return global.Promise.resolve();
      }

      return beforeFilters[0]
          .evaluateCondition()
          .then(null, (beforeFilterOrError) => {
            if (typeof beforeFilterOrError.startResolutionProcess ===
                'function') {
              beforeFilterOrError.startResolutionProcess();

              throw 'Resolving $$beforeFilter:' + beforeFilterOrError.getName();
            }
            else {
              // reject any other error!
              throw beforeFilterOrError;
            }
          })
          .then(() => this.authorize(beforeFilters.slice(1)));
    }

    public beforeFilter(name: string, toProvide: [string, () => any]) {
      this._beforeFilters[name] = new BeforeFilter(
          name,
          this._$injector.invoke(toProvide))
    }

    public getBeforeFilterByName(name: string): IBeforeFilter {
      if (this._beforeFilters[name]) {
        return this._beforeFilters[name];
      }

      throw new Error(`Route.getBeforeFilterByName:` +
          `A BeforeFilter with the name "${name}" doesn't exist!`);
    }


    public setIntended(routeName: string, routeParams): void {
      this._intendedRoute = {
        name:   routeName,
        params: routeParams
      };
    }

    public goToIntendedOr(routeName?: string, routeParams?: {any}): void {
      if (this._intendedRoute) {
        this._$state.transitionTo(
            this._intendedRoute.name,
            this._intendedRoute.params);
      }
      else if (typeof routeName == 'string') {
        this._$state.transitionTo(routeName, routeParams);
      }

      this.flushIntended();
    }

    public flushIntended() {
      this._intendedRoute = null;
    }

    public getIntended() {
      return this._intendedRoute;
    }

    // I think there is a need for AfterFilters as well
    // They will be the ones that catch speicific errors during the current oute
    // One example, is the 401 Authorization Code issue, coming from the server
    // on the Drawing Entries page for ex.

    // That could of course be more generalized, but I think there are some
    // other cases
  }
}
