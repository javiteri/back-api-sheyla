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

router.post('/insertarlistconfigfacelec', async (req, res) => {

    const insertListConfigPromise = configRepository.insertConfigsListFacElec(req.body);

    insertListConfigPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/listConfigsIdEmp', async (req, res) => {

    const getListConfigPromise = configRepository.getListConfigsByIdEmp(req.query.idEmp,req.query.nombreBd);

    getListConfigPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getConfigByIdEmp', async (req, res) => {

    const getListConfigPromise = configRepository.getConfigByIdEmp(req.query.idEmp, req.query.nombreConfig, req.query.nombreBd);

    getListConfigPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getConfigFirmaNameAndClaveByRuc', async (req, res) => {

    const getListConfigFirmaElectronicaPromise = configRepository.getConfigsFirmaElecNameAndPassword(req.query.ruc);

    getListConfigFirmaElectronicaPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});


module.exports = router;