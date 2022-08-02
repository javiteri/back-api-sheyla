const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const router = express.Router()

router.post('/login',
    async (req, res, next) => {

        passport.authenticate(
            async (err, user, info) => {
                try{
                    if(err || !user){
                        const error = new Error('ocurrio un error')

                        return next(error)
                    }

                    req.login(
                        user,
                        {session: false},
                        async (error) => {
                            if(error) return next(error);

                            const body = {_id: user._id, username: user.username};
                            const token = jwt.sign({user: body}, 'TOP SECRET KEY');

                            return res.json({token});
                        }
                    );

                }catch(error){
                    return next(error)
                }
            }
        )(req, res, next);
    }
);

module.exports = router;