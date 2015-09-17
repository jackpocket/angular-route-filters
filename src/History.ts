/// <reference path="./vendor.d.ts" />
'use strict';

module RouteFilters {

  export class RouteHistory {

    // root - 1st in the stack
    // current - last in the stack
    private _stack: [IRouteDataStructure] = [];

    constructor(root: IRouteDataStructure) {
      this._stack.push(root.name);
    }

    push(route: IRouteDataStructure) {
      if (this._isPrev(route)) {
        this._stack.pop();
      }
      else {
        this._stack.push(route.name);
      }

      console.log('new history', this._stack);
    }

    private _isPrev(route): boolean {
      console.log('--- is prev ---');
      console.debug(route.name, this._stack[this._stack.length - 2]);
      console.debug(this._stack);
      console.log('--- is prev ---');

      return route.name === this._stack[this._stack.length - 2];
    }

    get() {
      return this._stack;
    }

    prev() {
      return this._stack[this._stack.length - 2];
    }

    current() {
      return this._stack[this._stack.length - 1];
    }

    root() {
      return this._stack[0];
    }

    length() {
      return this._stack.length;
    }
  }

}
