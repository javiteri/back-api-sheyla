let express = require('express');
let router = express.Router();
let paymentsRepository = require('./data/PaymentsRepository');

router.get('/getIp', (req, res) => {
    const ipAddress = req.ip;
    res.status(200).send({ ip: ipAddress });
});

router.post('/getCheckoutId', async (req, res) =>{

    let amount = req.body.amount;

    const resultCheckoutId = paymentsRepository.ghetCheckoutId(amount);

    resultCheckoutId.then(
        function(result){
            res.status(200).send(result);
        },
        function(eror){
            res.status(400).send({
                isSucess: true,
                error: eror 
            });
        }

    ); 

});

router.get('/getTransactionStatus', async (req, res) =>{

    let id = req.query.id;
    let resorcePath = req.query.resourcePath;

    console.log(id);
    const resultCheckoutId = paymentsRepository.getTransactionStatus(id, resorcePath);

    resultCheckoutId.then(
        function(result){
            res.status(200).send(result);
        },
        function(eror){
            res.status(400).send({
                isSucess: true,
                error: eror 
            });
        }

    ); 

});


module.exports = router;