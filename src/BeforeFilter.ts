/// <reference path="./vendor.d.ts" />
/// <reference path="./interfaces.ts" />
'use strict';

module RouteFilters {

  export class BeforeFilter implements IBeforeFilter {

    /**
     * A placeholder for the filter scope, that will be shared between
     * the condition() and resolution() filter definition methods.
     *
     * This works the best with async conditions data, in which case
     * yoy don't want to refetch the same data in resolution().
     */
    private _filterScope: Basic.IHashMap<any>;

    constructor(private _name: string,
                private _definition: IBeforeFilterDefinition) {

      if (!_definition) {
        throw new Error('Route.beforeFilter: ' +
            'The returned result is not a BeforeFilter Object!');
      }

      if (typeof _definition.condition !== 'function') {
        throw new Error('Route.beforeFilter: ' +
            'The "condition" function must be provided!');
      }

      if (typeof _definition.resolution !== 'function') {
        throw new Error('Route.beforeFilter: ' +
            'The "resolve" function must be provided!');
      }

      this._filterScope = {};
    }

    getName(): string {
      return this._name;
    }

    /**
     * Ensure the result of the condition is a promise,
     * TODO: And memoize its final form.
     *
     * @returns {any}
     */
    public evaluateCondition(): Thenable<void> {
      let conditionOutput: boolean|Thenable<boolean>
          = this._definition.condition(this._filterScope);

      if (typeof conditionOutput === 'boolean') {
        return (conditionOutput === true)
            ? global.Promise.resolve()
            : global.Promise.reject(this);
      }
      else if (typeof conditionOutput.then === 'function') {
        return conditionOutput.then(null, () => { throw this; });
      }

      throw new Error('The condition must return Boolean or ' +
          'Promise.Thenable<boolean>. Instead it returned ' +
          typeof conditionOutput);

      // Memoize
      // The memoization fails here, because the promise
      // will always do the same thing as the 1st time (either resolve or
      // reject) This might work very good as an optimization pattern,
      // especially when condition checked over and over again shouldn't do the
      // heavy lifting each time. The problem I see with it, is
      // filter.condition = () => promise;
    }

    /**
     * Calls the resolve method given in the definition
     * And starts listening to any adjacent BeforeStateChange.
     *
     * Once the states changes the event is blocked, and a check on the
     * filter condition is being made again. If the condition passes this time,
     * the Resolution is resolved and a success Promise is returned.
     * Otherwise, the state change event continues as its part of the
     * resolution flow.
     *
     * @returns {any}
     */
    public startResolutionProcess(): void {
      this._definition.resolution(this._filterScope);
    }
  }
}
