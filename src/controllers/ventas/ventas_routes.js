const express = require('express')
const router = express.Router()

const ventasRepository = require('./data/VentasRepository');

router.post('/insertar', async (req, res, next) => {
    
    const resultInsertVentaProm = ventasRepository.insertVenta(req.body);
    resultInsertVentaProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/updateEstadoVenta', async(req, res, next) => {
    
    const resultUpdateEstadoVenta = ventasRepository.updateEstadoAnuladoVentaByIdEmpresa(req.body);
    resultUpdateEstadoVenta.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/deleteVenta', async(req, res, next) => {
    
    const resultDeleteEstadoVenta = ventasRepository.deleteVentaEstadoAnuladoByIdEmpresa(req.body);
    resultDeleteEstadoVenta.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/listaVentasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;

    const listaVentasIdEmpProm = ventasRepository.getListVentasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin);
    listaVentasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/listaResumenVentasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;

    const listaResumenVentasIdEmpProm = ventasRepository.getListResumenVentasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin);
    listaResumenVentasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/getorcreateconsfinalbyidemp', async(req, res, next) => {
    const getConsumidorFinalProm = ventasRepository.getOrCreateConsFinalByIdEmp(req.query.idEmp);
    getConsumidorFinalProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getNextNumeroSecuencialByIdEmp', async(req,res,next) => {
    const {idEmp, tipoDoc, fac001, fac002} = req.query;
    const nextSecuencialProm = 
            ventasRepository.getNextNumeroSecuencialByIdEmp(idEmp,tipoDoc,fac001,fac002);
    nextSecuencialProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});


module.exports = router;