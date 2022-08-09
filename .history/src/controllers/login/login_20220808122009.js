const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const router = express.Router()
const cookie = require('cookie')

const loginRepository = require('./loginRepository')

router.post('/login', async (req, res, next) => {

        console.log('inside loguin ')

        passport.authenticate('login', async (err, user, info) => {
                try{
                    
                    //console.log('err ' + err);
                    console.log('info ' + info.message);
                
                    console.log('user ' + user);

                    if(err || !user){
                        //const error = new Error('ocurrio un error')
                        
                        return res.send(info.message) 
                        //next(error)
                    }
                

                    req.login(
                        user,
                        {session: false},
                        async (error) => {
                            if(error) return next(error);
                        
                            const body = {_id: user.cedula, username: user.username};
                            const token = jwt.sign({
                                user: body,
                                exp: new Date().setDate(new Date().getDate() + 1)
                            }, 'TOP SECRET KEY');
                            

                            res.setHeader('Set-Cookie', cookie.serialize('token', token, {httpOnly: true}))
                            return res.json({token});
                        }
                    );

                }catch(error){
                    return next(error)
                }
            }
        )
        (req, res, next)
        
        //res.send('login terminado')
    }
);

router.post('/loginverify', async (req, res, next) => {

    
    const {ruc, user, password} = req.body;

    const resultValidate = loginRepository.loginValidateExistsClientRuc(ruc);

    resultValidate.then(
        function(result){


            if(result.isFacturacionAvailable){
                res.send('Ok tiene facturacion disponible');
            }else{
                res.send('no tiene facturacion disponible');
            }

            
        },
        function(error){
          console.log('inside reject ' + error);

          res.send('error validando empresa');
        }
    );
    
});

module.exports = router;