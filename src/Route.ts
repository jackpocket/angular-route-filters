/// <reference path="./basic.d.ts" />
/// <reference path="./BeforeFilter.ts" />
/// <reference path="./interfaces.ts" />
'use strict';


module RouteFilters {

  export class Route {

    private _beforeFilters: Basic.IHashMap<IBeforeFilter> = {};

    private _intendedRoute: {name: string, params: any};


    constructor(private _$injector, private _$state) {}

    /**
     * Iterates over the given beforeFilters, and evaluates their condition,
     *  in the given order. If one condition evaluation fails, the
     *  Authorization Process interrupts and the Resolution method for that
     *  particular `beforeFilter` is invoked - that is, the Resolution Process
     *  has started.
     *
     * The Resolution Process should simply offer an interface for the User to
     *  be able to authorize for the state he is trying to see, such as a
     *  Login or Registration Form, a checkbox selection, a confirm dialog, etc.
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

              throw 'Resolving $$beforeFilter:' +
              beforeFilterOrError.getName();
            }
            else {
              // reject any other error!
              throw beforeFilterOrError;
            }
          })
          .then(() => this.authorize(beforeFilters.slice(1)));
    }

    /**
     * Register a BeforeFilter with a given unique 'name'
     *  and a definition object.
     *
     * @param name
     * @param definition
     */
    public beforeFilter(name: string, definition: IBeforeFilterDefinition) {
      this._beforeFilters[name] =
          new BeforeFilter(name, this._$injector.invoke(definition))
    }

    public getBeforeFilterByName(name: string): IBeforeFilter {
      if (this._beforeFilters[name]) {
        return this._beforeFilters[name];
      }

      throw new Error(`Route.getBeforeFilterByName:` +
          `A BeforeFilter with the name "${name}" doesn't exist!`);
    }

    /**
     * Set the intended state.
     *
     * @param routeName
     * @param routeParams
     */
    public setIntended(routeName: string, routeParams): void {
      this._intendedRoute = {
        name:   routeName,
        params: routeParams
      };
    }

    /**
     * To be called when the current resolution flow needs to finish – that is
     *  of course, when the beforeFilter's condition passes.
     *
     * It simply redirects to the original state/route and restarts the
     *  state's authorization process.
     *
     * If indeed the current beforeFilter under resolution passed that means the
     *  state is authorized.
     *
     * If there are multiple beforeFilters, the authorization process will
     *  continue with the next ones, and in case one passes, it will
     *  automatically start the resolution process for it.
     *
     */
    public finishResolution(): void {
      if (this._intendedRoute) {
        this._$state.transitionTo(
            this._intendedRoute.name,
            this._intendedRoute.params);
      }
      else {
        console.warn('RouteFilters.resolutionFinished() - ' +
            'Trying to finish a resolution which never started! ' +
            'Make sure you are calling RouteFilters.resolutionFinished() only' +
            'a resolution process has started!');
      }

      this.flushIntended();
    }

    /**
     * Returns TRUE if in the middle of a resolution process.
     *
     * To be called when state you need to finish a reoslutino process.
     *
     * @returns {boolean}
     */
    public hasResolutionStarted(): boolean {
      return !!this.getIntended();
    }

    /**
     * TODO: Add tests
     * Go to the Intended State or to the given one if no intended exists
     *
     *
     * @param routeName
     * @param routeParams
     */
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

    /**
     * Flush the current Intended State
     */
    public flushIntended() {
      this._intendedRoute = null;
    }

    /**
     * Get the current Intended State
     *
     * @returns {{name: string, params: any}}
     */
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
