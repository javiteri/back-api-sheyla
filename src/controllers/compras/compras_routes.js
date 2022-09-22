const express = require('express');
const router = express.Router();
const comprasRepository = require('./data/ComprasRepository');

router.get('/listaComprasByIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;

    const listaComprasIdEmpProm = comprasRepository.getListComprasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin);
    listaComprasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/listaResumenComprasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;

    const listaResumenComprasIdEmpProm = comprasRepository.getListResumenComprasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin);
    listaResumenComprasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.post('/insertar', async (req, res, next) => {

    const resultInsertCompraProm = comprasRepository.insertCompra(req.body);
    resultInsertCompraProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getorcreateprovgenericobyidemp', async(req, res, next) => {
    const getProveedorGenericoProm = comprasRepository.getOrCreateProveedorGenericoByIdEmp(req.query.idEmp);
    getProveedorGenericoProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getNextNumeroSecuencialByIdEmp', async(req,res,next) => {
    const {idEmp, tipoDoc, idProveedor,compraNumero} = req.query;
    const nextSecuencialProm = 
            comprasRepository.getNextNumeroSecuencialByIdEmp(idEmp,tipoDoc,idProveedor,compraNumero);
    nextSecuencialProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/deleteCompra', async(req, res, next) => {
    
    const resultDeleteCompra = comprasRepository.deleteCompraByIdEmpresa(req.body);
    resultDeleteCompra.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});


module.exports = router;
