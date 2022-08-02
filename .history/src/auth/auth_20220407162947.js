const passport = require('passport');
const localStrategy = require('passport-local').Strategy

passport.use('login',
    new localStrategy({
        usernameField: 'user',
        passwordField: 'password'
    },
    async (user, password, done) => {
        try{
            const isUser = user == 'LIDER' 
            if(!isUser){
                return done(null, false,{message: 'usuario no encontrado'})
            }

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