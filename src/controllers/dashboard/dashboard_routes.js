const express = require('express');
const router = express.Router();

const dashboardRepository = require('./data/DashboardRepository');

router.get('/getinfoventadiaria', async (req, res) => {

    console.log('inside');
    
    const idEmp = req.query.idEmp;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const getInfoVentaPromise = dashboardRepository.getInfoVentaDiaria(idEmp,fechaIni,fechaFin);

    getInfoVentaPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getinfoventamensual', async (req, res) => {

    const idEmp = req.query.idEmp;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const getInfoVentaMensualPromise = dashboardRepository.getInfoVentaMensual(idEmp,fechaIni,fechaFin);

    getInfoVentaMensualPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getinfoclientesregistrados', async (req, res) => {

    const idEmp = req.query.idEmp;


    const getInfoVentaMensualPromise = dashboardRepository.getInfoClientesRegistrados(idEmp);

    getInfoVentaMensualPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getinfoproductosregistrados', async (req, res) => {

    const idEmp = req.query.idEmp;


    const getInfoProductosRegistradosPromise = dashboardRepository.getInfoProdctosRegistrados(idEmp);

    getInfoProductosRegistradosPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getnumdocslicencedays', async (req, res) => {

    const rucEmpresa = req.query.rucEmp;


    const getNumDocsAndLicenceDay = dashboardRepository.getDocEmitidosAndLicenceDays(rucEmpresa);

    getNumDocsAndLicenceDay.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getproductosdelmes', async (req, res) => {

    const idEmp = req.query.idEmp;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const getProductosDelMesProm = dashboardRepository.getProductosDelMesByIdEmp(idEmp,fechaIni,fechaFin);

    getProductosDelMesProm.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});
router.get('/getclientesdelmes', async (req, res) => {

    const idEmp = req.query.idEmp;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const getClientesDelMesPromise = dashboardRepository.getClientesDelMesByIdEmp(idEmp,fechaIni,fechaFin);

    getClientesDelMesPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});



module.exports = router;