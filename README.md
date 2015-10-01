# Angular Route Filters

A simple API to attach route filters (before and after) to routes in angular
projects.

## Features

- minimal overhead to add route filters
- works with sync and async conditions
- works with single or wizard like resolution flows
(that means once the condition fails, one or a sequence of states can attempt to
 resolve the condition)


## How it works?

A Route Filter must be registered with a __unique name__ and a __definition__ at
application.run() time.

When defining a state, which needs a form of authorization to be viewed, you can
add a __beforeFilters__ Array to the state's __data__ property.
The __beforeFilters__ takes an array of valid beforeFilter names.
The order in which the names are given represents the actual order in which
the beforeFilters will be later evaluated, so take that in account.

 ```
 .state('home-user', {
    ...
    data: {
      beforeFilters: ['beforeFilterName1', 'beforeFilterName2', ...]
    }
```

When the app starts, all the registered states that have at least one
beforeFilter declared, will get a new dependency called $$beforeFilters injected
in their resolve object.

\**Note - In order to make sure the $$beforeFilters gets executed first, and that no
other dependency or data is loaded for an unauthorized state, the $$beforeFilters
dependency gets also injected in all the other dependencies to resolve.
It will always get injected in the last position in the arguments list, and thus,
it should most of the time go unnoticed, but if, for some reason you depend on
the __arguments__ property of the function, make sure you slice off the last argument.

The State's resolve will take care of them from here on. If $$beforeFilters returns a
resolving promise, everything goes on as usual – that means the state is authorized -,
otherwise, the beforeFilter's resolution method will be invoked, and the
__Resolution Process__ will begin.*


## How to use it?

**1. First, register a beforeFilter by giving it a _name_ and a _definition object_.**

```
app.run(['routeFilters', function(routeFilters) {

    route.beforeFilter('user',
        ['authenticationService', '$state', function(auth, $state) {
            return {
                condition: function() {
                    return auth.isLoggedIn();
                },
                resolution: function () {
                    $state.go('login');
                }
            }
        }]
    })

}]);
```

**2. Secondly, append the newly created beforeFilter's name,
to any state in your application, under the `data.beforeFilters []` property**

\**Note, you can attach as many beforeFilters as you need and they will execute in the given order.*

```
app.config(['$stateProvider', function($stateProvider) {

    $stateProvider
        .state('home-user', {
          url        : '/user/home',
          controller : 'HomeUserCtrl',
          templateUrl: './views/home-user.html',
          resolve    : {},
          data       : {
            beforeFilters: [
              'user',
              //'other-beforeFilter',
              //'another-beforeFilter'
            ]
          }
        })
        .state('login', {
          url        : '/home',
          controller : 'HomeGuestCtrl',
          templateUrl: './views/home-guest.html',
          resolve    : {}
        });

}]);

```

**3. Lastly, we need to let the `routeFilters` service know that the resolution
process has finished**

```
app.controller('LoginCtrl', ['routeFilters', 'authService',
    function(routeFilters, authService) {

    authService.login(credentials);

    routeFilters.finishResolution();

}
```

Once the finishResolution() method is called the user simply gets redirected
back to the original state, and the state's beforeFilters are reevaluated.
If the condition for the current beforeFilter passes, it will move further in
the beforeFilters list, otherwise, it will restart the *Authorization Process*.

If indeed the current beforeFilter under resolution passed that means the
state is authorized.

If there are multiple beforeFilters, the authorization process will
continue with the next ones, and in case one fails, it will
automatically start the resolution process for it.

## API

'routeFilters'

### beforeFilter
---

    beforeFilter(name: string, definition: BeforeFilterDefinition): void

Registers a BeforeFilter with a given unique 'name' and a definition object.

The definition object consists of 2 methods:
- condition() which must return a boolean or a promise and
- resolution() which is invoked when the condition fails.  


### finishResolution
---

    finishResolution(): void

To be called when the current resolution flow needs to finish – that is
of course, when the beforeFilter's condition passes.

It simply redirects to the original state/route and restarts the state's
authorization process.


### hasResolutionStarted
---

    hasResolutionStarted(): boolean

Returns TRUE if in the middle of a resolution process.


## Dependencies

- es6 Promises   


## Current flaws

- the AfterFilters are not implemented yet
- it only works with ui-router (but going to make it available for angular-route soon)
- it doesn't work with nested beforeFilters (correctly)
- you need to specifically call routeFilters.goToIntended() in your implementation (most likely at the controller level)
once the resolution process is finished
(\**Note - this is a larger discussion, and a pretty hard problem to solve. See [issue #1](https://github.com/GabrielCTroia/angular-route-filters/issues/1))*   



## See it in action

Run `npm start` to check the sample
