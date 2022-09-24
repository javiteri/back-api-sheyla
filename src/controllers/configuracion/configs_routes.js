var express = require('express');
var router = express.Router();
const configRepository = require('./data/ConfigRepository');

router.post('/insertarlist', async (req, res) => {

    const insertListConfigPromise = configRepository.insertConfigsList(req.body);

    insertListConfigPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;