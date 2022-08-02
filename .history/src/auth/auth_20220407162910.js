const passport = require('passport');
const localStrategy = require('passport-local').Strategy

passport.use('login',
    new localStrategy({
        usernameField: 'user',
        passwordField: 'password'
    },
    async (user, password, done) => {
        try{
            const isUser = user == 'LIDER' && password == '123'

        }catch(error){
            return done(error);
        }
    })
)


/*passport.use(
    'singup',
    new localStrategy(
        {
            usernameField: 'user',
            passwordField: 'password'
        },
        async(user, password, done) => {
            try{

            }catch(error){
                done(error);
            }
        }
    )
)*/