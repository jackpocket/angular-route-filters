/// <reference path="./BeforeFilter" />
/// <reference path="./Route" />
/// <reference path="./interfaces" />

var global = window;
var routeFilters = RouteFilters;

angular.module('routeFilters', [
    'ui.router'
])
  .service('route', ['$injector', '$rootScope', routeFilters.Route]);