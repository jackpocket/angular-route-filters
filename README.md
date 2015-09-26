# Angular Route Filters

A simple API to attach route filters (before and after filters) to routes
in angular projects.

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

**2. Secondly, append the newly created before filter's name, 
to any state in your application, under the `data.beforeFilters []` property** 

*Note, you can attach as many beforeFilters as you need and they will execute in the given order.

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
process has finished, and that it should try to authorize the state again. **

```
app.controller('LoginCtrl', ['routeFilters', 'authService', function(routeFilters, authService) {
    
    authService.login(credentials);
    
    routeFilters.finishResolution();
    
}
```

We simply redirect the user back to the original state, once we know the 
beforeFilter's condition will pass. Don't worry the state will be re-authorized, 
and thus if the condition is actually not passing, it twill restart the 
resolution flow again.

## API

The RouteFilters Service iterates over any state's beforeFilters, and evaluates 
their condition, in the given order. If one condition evaluation fails, the 
Authorization Process interrupts and the Resolution method for that particular 
`beforeFilter` is invoked - that is, the Resolution Process starts.
     
The Resolution Process should simply offer an interface for the User to be able 
to authorize for the state he is trying to see, such as a Login or 
Registration Form, a checkbox selection, a confirm dialog, etc.

### beforeFilter
---

    beforeFilter(name: string, definition: BeforeFilterDefinition): void
    
Registers a BeforeFilter with a given unique 'name' and a definition object.

     
### finishResolution
---

    finishResolution(): void

To be called when the current resolution flow needs to finish – that is 
of course, when the beforeFilter's condition passes.

It simply redirects to the original state/route and restarts the state's 
authorization process.

If indeed the current beforeFilter under resolution passed that means the 
state is authorized.

If there are multiple beforeFilters, the authorization process will
continue with the next ones, and in case one passes, it will
automatically start the resolution process for it.


### hasResolutionStarted
---

    hasResolutionStarted(): boolean

Returns TRUE if in the middle of a resolution process.


## Dependencies

- es6 Promises 

## Features

- simple API and minimal overhead to add route filters
- works with sync and async conditions
- works with single or wizard like resolution processes (that means one or multiple states/routes for the resolution process)  

## Current flaws

- the AfterFilters are not implemented yet
- it only works with ui-router (but going to make it available for angular-route soon)
- it doesn't work with nested beforeFilters (correctly)
- you need to specifically call routeFilters.goToIntended() in your implementation (most likely at the controller level) 
once the resolution process is finished
(*Note - this is a larger discussion, and a pretty hard problem to solve. See [issue #1](https://github.com/GabrielCTroia/angular-route-filters/issues/1))   



## See it in action

Run `npm start` to check the sample