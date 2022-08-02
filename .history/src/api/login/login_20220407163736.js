const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const router = express.Router()

router.post('/login',
    async (req, res, next) => {
        passport.authenticate(
            'login',
            async (err, isUser, info) => {
                try{
                    if(err || !isUser){
                        const error = new Error('ocurrio un error')

                        return next(err)
                    }
                }catch(error){

                }
            }
        )
    }
)