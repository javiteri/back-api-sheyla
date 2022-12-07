const express = require('express');
const router = express.Router();

const dashboardRepository = require('./data/DashboardRepository');

router.get('/getinfoventadiaria', async (req, res) => {

    const idEmp = req.query.idEmp;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getInfoVentaPromise = dashboardRepository.getInfoVentaDiaria(idEmp,fechaIni,fechaFin, nombreBd);

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
    const nombreBd = req.query.nombreBd;

    const getInfoVentaMensualPromise = dashboardRepository.getInfoVentaMensual(idEmp,fechaIni,fechaFin, nombreBd);

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
    const nombreBd = req.query.nombreBd;

    const getInfoVentaMensualPromise = dashboardRepository.getInfoClientesRegistrados(idEmp, nombreBd);

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
    const nombreBd = req.query.nombreBd;

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
    const nombreBd = req.query.nombreBd;

    const getNumDocsAndLicenceDay = dashboardRepository.getDocEmitidosAndLicenceDays(rucEmpresa, nombreBd);

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
    const nombreBd = req.query.nombreBd;

    const getProductosDelMesProm = dashboardRepository.getProductosDelMesByIdEmp(idEmp,fechaIni,fechaFin,nombreBd);

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
    const nombreBd = req.query.nombreBd;

    const getClientesDelMesPromise = dashboardRepository.getClientesDelMesByIdEmp(idEmp,fechaIni,fechaFin,nombreBd);

    getClientesDelMesPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getventasdeldiaformapago', async (req, res) => {

    const idEmp = req.query.idEmp;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getVentasDelDiaFormaPagoPromise = dashboardRepository.getVentasDiaFormaPagoByIdEmp(idEmp,fechaIni,fechaFin,nombreBd);

    getVentasDelDiaFormaPagoPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});



module.exports = router;