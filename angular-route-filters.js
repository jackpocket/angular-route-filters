/// <reference path="./vendor.d.ts" />
/// <reference path="./basic.d.ts" />
'use strict';
/// <reference path="./vendor.d.ts" />
/// <reference path="./interfaces.ts" />
'use strict';
var RouteFilters;
(function (RouteFilters) {
    var BeforeFilter = (function () {
        function BeforeFilter(_name, _definition) {
            this._name = _name;
            this._definition = _definition;
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
        BeforeFilter.prototype.getName = function () {
            return this._name;
        };
        /**
         * Ensure the result of the condition is a promise,
         * TODO: And memoize its final form.
         *
         * @returns {any}
         */
        BeforeFilter.prototype.evaluateCondition = function () {
            var _this = this;
            var conditionOutput = this._definition.condition(this._filterScope);
            if (typeof conditionOutput === 'boolean') {
                return (conditionOutput === true)
                    ? global.Promise.resolve()
                    : global.Promise.reject(this);
            }
            else if (typeof conditionOutput.then === 'function') {
                return conditionOutput.then(null, function () { throw _this; });
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
        };
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
        BeforeFilter.prototype.startResolutionProcess = function () {
            this._definition.resolution(this._filterScope);
        };
        return BeforeFilter;
    })();
    RouteFilters.BeforeFilter = BeforeFilter;
})(RouteFilters || (RouteFilters = {}));
/// <reference path="./basic.d.ts" />
/// <reference path="./BeforeFilter.ts" />
/// <reference path="./interfaces.ts" />
'use strict';
var RouteFilters;
(function (RouteFilters) {
    var Route = (function () {
        function Route(_$injector, _$state) {
            this._$injector = _$injector;
            this._$state = _$state;
            this._beforeFilters = {};
        }
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
        Route.prototype.authorize = function (beforeFilters) {
            var _this = this;
            // If there are no beforeFilters given resolve it right.
            // This is the exit from the recursive call.
            if (beforeFilters.length === 0) {
                return global.Promise.resolve();
            }
            return beforeFilters[0]
                .evaluateCondition()
                .then(null, function (beforeFilterOrError) {
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
                .then(function () { return _this.authorize(beforeFilters.slice(1)); });
        };
        Route.prototype.beforeFilter = function (name, toProvide) {
            this._beforeFilters[name] = new RouteFilters.BeforeFilter(name, this._$injector.invoke(toProvide));
        };
        Route.prototype.getBeforeFilterByName = function (name) {
            if (this._beforeFilters[name]) {
                return this._beforeFilters[name];
            }
            throw new Error("Route.getBeforeFilterByName:" +
                ("A BeforeFilter with the name \"" + name + "\" doesn't exist!"));
        };
        /**
         * Set the intended state.
         *
         * @param routeName
         * @param routeParams
         */
        Route.prototype.setIntended = function (routeName, routeParams) {
            this._intendedRoute = {
                name: routeName,
                params: routeParams
            };
        };
        /**
         * TODO: Add tests
         * Go to the Intended State or to the given one if no intended exists
         *
         *
         * @param routeName
         * @param routeParams
         */
        Route.prototype.goToIntendedOr = function (routeName, routeParams) {
            if (this._intendedRoute) {
                this._$state.transitionTo(this._intendedRoute.name, this._intendedRoute.params);
            }
            else if (typeof routeName == 'string') {
                this._$state.transitionTo(routeName, routeParams);
            }
            this.flushIntended();
        };
        /**
         * Flush the current Intended State
         */
        Route.prototype.flushIntended = function () {
            this._intendedRoute = null;
        };
        /**
         * Get the current Intended State
         *
         * @returns {{name: string, params: any}}
         */
        Route.prototype.getIntended = function () {
            return this._intendedRoute;
        };
        return Route;
    })();
    RouteFilters.Route = Route;
})(RouteFilters || (RouteFilters = {}));
/// <reference path="./vendor.d.ts" />
/// <reference path="./BeforeFilter" />
/// <reference path="./Route" />
/// <reference path="./interfaces" />
var global = window;
var routeFilters = RouteFilters;
angular.module('jp.routeFilters', [
    'ui.router'
])
    .service('routeFilters', ['$injector', '$state', routeFilters.Route])
    .factory('jp.routeFilters._helper', ['$state', function ($state) { return ({
        getStates: function () { return Array.prototype.filter.call($state.get(), function (state) { return !state.abstract; }); },
        getBeforeFilterNames: function (state) { return (state.data || {}).beforeFilters || []; }
    }); }])
    .run([
    '$rootScope',
    'routeFilters',
    'jp.routeFilters._helper',
    function ($rootScope, route, helper) {
        Array.prototype.map.call(helper.getStates(), function (state) {
            var beforeFilterNames = helper.getBeforeFilterNames(state);
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
                Object.keys(state.resolve).map(function (service) {
                    var dp = state.resolve[service];
                    if (Array.isArray(dp)) {
                        var fn = dp.pop();
                        dp.push('$$beforeFilters');
                        dp.push(fn);
                    }
                    else if (typeof dp === 'function') {
                        dp.$inject = dp.$inject || [];
                        dp.$inject.push('$$beforeFilters');
                    }
                });
                state.resolve['$$beforeFilters'] = [
                    '$stateParams',
                    function ($stateParams) {
                        var beforeFilters = Array.prototype.map.call(beforeFilterNames, function (bfName) { return route.getBeforeFilterByName(bfName); });
                        return route
                            .authorize(beforeFilters)
                            .then(null, function (e) {
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
