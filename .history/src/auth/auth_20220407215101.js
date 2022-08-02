const passport = require('passport');
const localStrategy = require('passport-local').Strategy
const JWTstrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt
const loginRepository = require('../api/login/loginRepository')


passport.use(
    new JWTstrategy(
        {
            secretOrKey: 'TOP SECRET KEY',
            jwtFromRequest: ExtractJWT.fromUrlQueryParameter('secret_token')
        },
        async (token, done) => {
            try{
                console.log(`${token.user.username}`)
                return done(null, token.user);
            }catch(error){
                done(error);
            }
        }
    )
)

passport.use('login',
    new localStrategy({
        usernameField: 'user',
        passwordField: 'password'
    },
    async (user, password, done) => {
        try{

            const userPromise = loginRepository.login(user, password);
            
            userPromise.then(
                function(result){

                    if(!result){
                        return done(null, false, {message: 'no se encontro usuario con esas credenciales'})
                    }

                    let userSelected = {
                        'cedula': result.cedula,
                        'nombre': result.nombre
                    }

                    return done(null, userSelected, {message: 'logeado satisfactoriamente'})
                },
                function(error){
                    console.log(error)
                }
            )
        }catch(error){
            return done(error);
        }
    })
);



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