const passport = require('passport');
const localStrategy = require('passport-local').Strategy

passport.use('login',
    new localStrategy({
        usernameField: 'user',
        passwordField: 'password'
    },
    async (user, password, done) => {
        try{

            var user = null
            const isUser = user == 'LIDER' 

            if(isUser){
                user =  {
                    id: 1,
                    username: 'Lider',
                    apellido: 'Andrade',
                    direccion: 'Nuevo Israel'
                }
            }


            if(!isUser){
                return done(null, false,{message: 'usuario no encontrado'})
            }

            const isPassowrd = password == '123'
            if(!isPassowrd){
                return done(null, false,{message: 'Password Incorrecta'})
            }

            return done(null, user, {message: 'logeado satisfactoriamente'})
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