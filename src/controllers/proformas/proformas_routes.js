const express = require('express');
const router = express.Router();
const {deleteFile} = require('../../util/sharedfunctions');
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
                deleteFile(clientes['pathFile']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/generatepdffromproforma', async(req, res) => {
    const {idEmp,idProforma,identificacion, nombreBd} = req.query;
    const generatePdfProformaPromise = proformaRepository.generateDownloadPdfFromProforma(idEmp,idProforma,identificacion,nombreBd);

    generatePdfProformaPromise.then(
        function(response){
            res.download(response['generatePath'],((error) => {
                deleteFile(response['generatePath']);
            }));

        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getDataByIdProforma',async(req,res,next) => {
    const idProforma = req.query.id;
    const idEmp = req.query.idEmp;
    const ruc = req.query.ruc;
    const nombreBd = req.query.nombreBd;

    const getDataByIdProformaPromise = 
            proformaRepository.getDataByIdProforma(idProforma, idEmp, ruc, nombreBd);
    getDataByIdProformaPromise.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;