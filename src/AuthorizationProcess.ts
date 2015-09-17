'use strict';

module RouteFilters {

  export class AuthorizationProcess {

    constructor(private _beforeFilters: [BeforeFilter]) {}

    /**
     * Apply the Given before filters
     * If any of the filter condition fails, the resolution for the given
     *  beforeFilter will be called, and once resolved the method will
     * recursively be called again with the rest of the unevaluated
     * beforeFilters.
     *
     * @param index
     * @returns {any}
     */
    public authorize(index: number = 0) {
      // If the names are empty resolve right away!
      // This is the exit of the recursive
      if (index === this._beforeFilters.length) {
        return global.Promise.resolve();
      }

      console.info('AuthorizationProcess: authorizing',
          this._beforeFilters[index].getName());

      return this._beforeFilters[index]
          .condition()
          .catch((beforeFilterOrError) => {
            if (typeof beforeFilterOrError.resolve === 'function') {
              return beforeFilterOrError.resolve()
            }
            else {
              // reject any other error!
              throw beforeFilterOrError;
            }
          })
          .then(() => this.authorize(++index));
    }

    public destroy() {
      // need a way to destroy this and the before filters involved.
    }

  }

}
