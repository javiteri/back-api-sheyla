const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const router = express.Router()

router.post('/login',
    async (req, res, next) => {
        passport.authenticate(
            'login',
            async (err, user, info) => {
                try{
                    if(err || !user){
                        const error = new Error('ocurrio un error')

                        return next(err)
                    }

                    req.login()

                }catch(error){
                    return next(error)
                }
            }
        )
    }
)