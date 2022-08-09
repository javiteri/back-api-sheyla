const passport = require('passport');
const localStrategy = require('passport-local').Strategy
const JWTstrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt
const loginRepository = require('../../controllers/login/loginRepository')

const cookieExtractor = req => {
    let jwt = null

    if(req && req.cookies){
        jwt = req.cookies['token']
    }
    return jwt
}


passport.use(
    new JWTstrategy(
        {
            secretOrKey: 'TOP SECRET KEY',
            jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken()//cookieExtractor//ExtractJWT.fromAuthHeaderAsBearerToken()// fromUrlQueryParameter('secret_token')
        },
        async (token, done) => {
            try{
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
                    
                    console.log('response in ath:' + result);

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

