const passport = require('passport');
const localStrategy = require('passport-local').Strategy

passport.use(
    'singup',
    new localStrategy(
        {
            usernameField: 'user',
            passwordField: 'password'
        }
    )
)