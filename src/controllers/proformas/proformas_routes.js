const express = require('express');
const router = express.Router();
const fs = require('fs');
const proformaRepository = require('./data/ProformaRepository')


router.post('/insertar', async (req, res, next) => {
    
    const resultInsertProf = proformaRepository.insertProforma(req.body);
    resultInsertProf.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getProformasIdEmp', function(req, res) {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;
    let nombreBd = req.query.nombreBd;

    const respListProformas = proformaRepository.getListProformasByIdEmpresa(idEmp,nombreCi, noDoc, fechaIni, fechaFin, nombreBd);

    respListProformas.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

router.get('/getNoProformaByIdUsr', async(req,res,next) => {
    const {idEmp, idUsuario, nombreBd} = req.query;
    
    const nextSecuencialProforma = 
            proformaRepository.getNoProformaSecuencialByIdusuarioAndEmp(idEmp, idUsuario, nombreBd);
    nextSecuencialProforma.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});


router.post('/deleteProforma', async(req, res, next) => {
    
    const resultDeleteEstadoVenta = proformaRepository.deleteProformaEstadoAnuladoByIdEmpresa(req.body);
    resultDeleteEstadoVenta.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getlistproformasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getListaProformasExcelPromise = proformaRepository.getListListaProformasExcel(idEmp,fechaIni, fechaFin,nombreCi,noDoc,nombreBd);

    getListaProformasExcelPromise.then(
        function (clientes){
            if(clientes.isSucess == false){
                res.status(200).send();
                return;
            }
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

router.get('/generatepdffromproforma', async(req, res) => {
    const {idEmp,idVentaCompra,identificacion, nombreBd} = req.query;
    const generatePdfVentaPromise = documentosElectronicosRepository.generateDownloadPdfFromVenta(idEmp,idVentaCompra,identificacion, true, nombreBd);

    generatePdfVentaPromise.then(
        function(response){
            res.download(response['generatePath'],((error) => {
                if(error){
                }
                fs.unlink(response['generatePath'], function(){
                    console.log("File was deleted") 
                });
            }));

        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;