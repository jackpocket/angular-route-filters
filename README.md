# Angular Route Filters

A simple API to attach route filters (before and after filters) to routes
in angular projects.

## How to use it?

```

app.run(['route', function(route) {
    
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


app.config(['$stateProvider', function($stateProvider) {

    $stateProvider
        .state('home-user', {
          url        : '/user/home',
          controller : 'HomeUserCtrl',
          templateUrl: './views/home-user.html',
          resolve    : {},
          data       : {
            beforeFilters: [
              'user'
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

## See it in action

Run `npm start` to check the sample