const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const router = express.Router()
const cookie = require('cookie')

const loginRepository = require('./loginRepository')
const secretkey = process.env.SECRET_KEY_HASH;

router.post('/login', async (req, res, next) => {
        passport.authenticate('login', async (err, user, info) => {
                try{
                    if(err || !user){
                        return res.send(info.message) 
                    }
                
                    req.login(user, {session: false}, async (error) => {
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
    
    }
);


router.post('/loginverify2', async (req, res, next) => {

    const {ruc, user, password} = req.body;

    const resultValidate = loginRepository.loginAndValidateEmp(ruc, user, password);    

    resultValidate.then(
        function(result){
            
            if(result.isSuccess && result.existUser){
                const body = {_id: result.rucEmpresa, username: result.idUsuario};

                const token = jwt.sign({
                    user: body,
                }, secretkey, {expiresIn: 43200});//seconds = 12 horas                                

                result["token"] = token;
                result["expire"] = 43200
                        
                res.status(200).send(result);
                return;
            }

            res.status(200).send(result);
        
        },
        function(error){
            res.status(200).send({
                isSuccess: true,
                error: 'ocurrio un error, reintente'
            });
        }
    );
    
});

router.get('/crearnuevaempresa', async(req, res) => {
    const rucEmp = req.query.ruc;
    const crearEmpresaProm = loginRepository.createEmpresaByRuc(rucEmp);

    crearEmpresaProm.then(
        function(response){
            res.status(200).send(response);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/recoverypassword', async(req, res) => {
    const rucEmp = req.query.ruc;
    const email = req.query.email;
    const recoveryEmpresaProm = loginRepository.recoveryPasswordByRucAndEmail(rucEmp,email);

    recoveryEmpresaProm.then(
        function(response){
            res.status(200).send(response);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/verifyExistAdminByRucEmp', async(req, res) => {

    const resultValidate = loginRepository.validateDefaultUserByRuc(req.query.ruc);

    resultValidate.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(300).send(error);
        }
    );
});


module.exports = router;