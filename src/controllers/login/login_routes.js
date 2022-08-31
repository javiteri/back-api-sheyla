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

    const resultValidate = loginRepository.loginValidateExistEmpresaRucBd1(ruc);    

    resultValidate.then(
        function(result){

            if(result.isFacturacionAvailable){

                const validateUserAndBusiness = loginRepository.loginValidateEmpresaAndUser(ruc, user, password);
                validateUserAndBusiness.then(
                    function(response){

                        const body = {_id: response.rucEmpresa, username: response.idUsuario};
                            
                        const token = jwt.sign({
                                user: body,
                                //exp: new Date().setDate(new Date().getDate() + 1)
                        }, process.env.SECRECT_KEY_HASH, {expiresIn: 43200});//seconds = 12 horas


                        response["token"] = token;
                        response["expire"] = 43200//seconds
                        
                        res.status(200).send(response);

                    },
                    function(error){
                        console.log('reject data: ' + error);
                        res.send({
                            'error': error
                        });
                        return;
                    }
                )

            }else{
                res.status(200).send({
                    isSuccess: true,
                    error : 'no tiene facturacion disponible'
                });
            }

            
        },
        function(error){
  
            res.status(200).send({
                isSuccess: true,
                error: 'no existe empresa'
            });
        }
    );
    
});

module.exports = router;