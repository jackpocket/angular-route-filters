/// <reference path="./basic.d.ts" />
'use strict';

module RouteFilters {

  export class Route {

    private _beforeFilters: Basic.IHashMap<IBeforeFilter> = {};

    private _currentlyResolving: Basic.IHashMap<IBeforeFilter> = {};

    constructor(private _$injector, private _state) {}

    public authorize(route, event) {
      var beforeFilterNames = (route.data || {}).beforeFilters || [];

      if (beforeFilterNames.length > 0) {
        console.info('Authorizing the BeforeFilters...', beforeFilterNames.join(','));

        event.block();

        this.applyBeforeFilters(beforeFilterNames)
            .then(() => event.continue());
      }

    }

    /**
     * Apply the Given before filters
     * If any of the filter condition fails, the resolution for the given
     *  beforeFilter will be called, and once resolved the method will
     * recursively be called again with the rest of the unevaluated
     * beforeFilters.
     *
     * @param names
     * @returns {IPromise<TResult>|IPromise<any>|any}
     */
    public applyBeforeFilters(names: Array<string>) {
      console.info('Applying the BeforeFilters...', names.join(','));

      // If the names are empty resolve right away!
      if (names.length === 0) {
        return new global.Promise((resolve) => {
          resolve();
        });
      }

      // TODO: Refactor this!
      // If there there is a currently resolving beforeFilter in the given list
      // than jump right on that and resolve it!
      // When done, call itself to continue with the rest of them!
      for (var i = 0; i < names.length; i++) {
        if (this._isCurrentlyResolving(names[i])) {
          console.warn(`BeforeFilter - '${names[i]}' is currently ` +
              `resolving, but an attempt to be reapplied has been made!
            This could happen due to a conflict in the resolution flow,
            or the User went back without resolving, and retried to enter the
            unauthorized state!`);

          return ((name: string, restOfNames: Array<string>) => {
            console.warn(`Resolving BeforeFilter - ${names[i]}...`);

            return this.getBeforeFilterByName(name)
                .resolve()
                .then(() => {
                  delete this._currentlyResolving[name];

                  return this.applyBeforeFilters(restOfNames);
                });
          })(names[i], names.slice(i + 1));
        }
      }

      return global.Promise
          .each(names, (n: string) => this.getBeforeFilterByName(n).condition())
          .catch((beforeFilterOrError) => {
            if (typeof beforeFilterOrError.resolve === 'function') {

              var name = beforeFilterOrError.getName();

              // Save the currently resolving beforeFilter
              this._currentlyResolving[name] = beforeFilterOrError;

              return beforeFilterOrError.resolve()
                  .then(() => {
                    delete this._currentlyResolving[name];

                    var currentFilterIndex =
                        names.indexOf(beforeFilterOrError.getName());

                    var restOfNames = names.slice(currentFilterIndex + 1);

                    // Recursively Async check the rest of the conditions
                    return this.applyBeforeFilters(<[string]>restOfNames);
                  });
            }

            // reject any other error!
            return new global.Promise((resolve, reject) => {
              reject(beforeFilterOrError);
            });
          });
    }

    private _isCurrentlyResolving(name) {
      return this._currentlyResolving.hasOwnProperty(name);
    }


    public beforeFilter(name: string, toProvide: [string, () => any]) {
      this._beforeFilters[name] = new BeforeFilter(
          name, this._$injector.invoke(toProvide), this._state);
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
