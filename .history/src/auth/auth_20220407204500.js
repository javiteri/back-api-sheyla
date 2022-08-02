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

            const userSelectMysql = loginRepository.login(user, password);
            
            console.log(userSelectMysql);

            if(!userSelectMysql){
                return done(null, false, {message: 'no se encontro usuario con esas credenciales'})
            }

            return done(null, userSelectMysql, {message: 'logeado satisfactoriamente'})
            //const isUser = user === 'LIDER' 

            /*if(isUser){
                userSelected =  {
                    id: 1,
                    username: 'Lider',
                    apellido: 'Andrade',
                    direccion: 'Nuevo Israel'
                }
            }*/
            

            /*if(!isUser){
                return done(null, false, { message: 'usuario no encontrado'})
            }

            const isPassowrd = password === '123'
            if(!isPassowrd){
                console.log('inside is password if auth js')
                return done(null, false,{message: 'Password Incorrecta'})
            }*/

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