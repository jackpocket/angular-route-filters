/// <reference path="./vendor.d.ts" />
'use strict';

module RouteFilters {

  export class BeforeFilter implements IBeforeFilter {

    private _currentlyResolvingPromise: PromisesAPlus.Thenable<void> = null;

    /**
     * A placeholder for the filter scope, that will be shared between
     * the condition() and resolve() filter definition methods.
     *
     * This works the best with async conditions data, in which case
     * yoy don't want to refetch the same data in resolve().
     */
    private _filterScope: Basic.IHashMap<any>;

    constructor(private _name,
                private _definition: IBeforeFilterDefinition,
                private _state) {

      if (!_definition) {
        throw new Error('Route.beforeFilter: ' +
            'The returned result is not a BeforeFilter Object!');
      }

      if (typeof _definition.condition !== 'function') {
        throw new Error('Route.beforeFilter: ' +
            'The "condition" function must be provided!');
      }

      if (typeof _definition.resolve !== 'function') {
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
    public condition(): PromisesAPlus.Thenable<void> {
      var conditionOutput = this._definition.condition(this._filterScope);

      if (typeof conditionOutput === 'boolean') {
        console.info(`BeforeFilter - '${this._name}' condition is SYNC!`);

        return new global.Promise((resolve, reject) => {
          if (conditionOutput === true) {
            console.info(`BeforeFilter - '${this._name}' condition resolved!`);
            resolve();
          }
          else {
            console.info(`BeforeFilter - '${this._name}' condition rejected!`);
            reject(this);
          }
        });
      }
      else if (conditionOutput.hasOwnProperty('then')
          && typeof conditionOutput.then === 'function') {
        console.info(`BeforeFilter - '${this._name}' condition is ASYNC!`);

        return conditionOutput
            .then(
            () => {
              console.info(`BeforeFilter - '${this._name}' condition resolved!`);
            }, () => {
              console.info(`BeforeFilter - '${this._name}' condition rejected!`);
              throw this;
            });
      }

      throw new Error('Route:beforeFilter.condition() is not boolean|Thenable!');

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
    public resolve(): PromisesAPlus.Thenable<void> {
      console.info(`BeforeFilter - '${this._name}' resolution started!`);

      this._definition.resolve(this._filterScope);

      // If the filter is currently resolving,
      // return that resolution promise;
      if (this._currentlyResolvingPromise != null) {
        return this._currentlyResolvingPromise;
      }

      // I need to test it 1st, but I think what I need here is to delete this
      // promise and therefore listener inside, and to return a new one.
      // Otherwise when the promise resolves it will resolve in all the places
      // it was called, and thus on Route the 1st resolved promise will also
      // be called, which means that it will go to the old URL, and it will
      // try to apply the rest of the filters of the old route.
      return this._currentlyResolvingPromise = new global.Promise((resolve) => {

        var destroyEventChangeListener = this._state
            .beforeChange((nextStateChangeEvent) => {
              // Wait for the condition to be reverified.
              // There is a chance the previous state just solved the condition
              // In which case, the beforeFilter must resolve 1st.
              nextStateChangeEvent.block();

              this.condition()
                  .then(() => {
                    console.info(`BeforeFilter - '${this._name}' resolved!`);
                    // Destroy the listener, asap as the resolution is done
                    // This will clean up memory, and also fix a nasty bug,
                    //  Where each next state change would get blocked by
                    // default!
                    destroyEventChangeListener();

                    this._currentlyResolvingPromise = null;
                    // Resolve the Promise!
                    resolve();
                  }, () => {
                    // CANNOT REJECT HERE, B/C ONCE REJECTED THE RESOLVE
                    //  IS NEVER CONSUMED AFTER!

                    // The condition hasn't been met yet, therefore the next
                    // state is part of the resolution flow.
                    nextStateChangeEvent.continue();
                  });
            });
      });
    }
  }
}
