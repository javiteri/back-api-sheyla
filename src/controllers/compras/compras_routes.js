const express = require('express');
const router = express.Router();
const fs = require('fs');
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

router.get('/getDataByIdCompra',async(req,res,next) => {
    const getDataByIdCompraPromise = 
            comprasRepository.getDataByIdCompra(req.query.id, req.query.idEmp);
    getDataByIdCompraPromise.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistcomprasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const getListaComprasExcelPromise = comprasRepository.getListaComprasExcel(idEmp,fechaIni,fechaFin,nombreCi,noDoc);

    getListaComprasExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistresumencomprasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const getListaComprasExcelPromise = comprasRepository.getListaResumenComprasExcel(idEmp,fechaIni,fechaFin,nombreCi,noDoc);

    getListaComprasExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});


module.exports = router;
