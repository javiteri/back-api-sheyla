const express = require('express');
const router = express.Router();
const {deleteFile} = require('../../util/sharedfunctions');
const documentosElectronicosRepository = require('./data/DocumentosElectronicosRepository');

router.get('/getlistdocumentoselectronicos', async (req, res) => {

    const documentosElectronicosProm = documentosElectronicosRepository.getDocumentosElectronicosByIdEmp(req.query);
    documentosElectronicosProm.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

router.get('/getlistdocumentoselectronicosnoautorizados', async (req, res) => {

    const documentosElectronicosProm = documentosElectronicosRepository.getDocumentosElectronicosByIdEmpNoAutorizados(req.query);
    documentosElectronicosProm.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});


router.get('/generatepdffromventa', async(req, res) => {
    const {idEmp,idVentaCompra,identificacion, nombreBd} = req.query;
    const generatePdfVentaPromise = documentosElectronicosRepository.generateDownloadPdfFromVenta(idEmp,idVentaCompra,identificacion, true, nombreBd);

    generatePdfVentaPromise.then(
        function(response){
            res.download(response['generatePath'],((error) => {
                if(error){
                }
                deleteFile(response['generatePath']);
            }));

        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistdocumentoselectronicosexcel', async(req, res) => {

    const getListDocElectronicosExcelPromise = documentosElectronicosRepository.getListDocElectronicosExcel(req.query);

    getListDocElectronicosExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {
                deleteFile(clientes['pathFile']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
})

router.post('/autorizarlistdocumentosbyid', async (req, res) => {
    const responseQuery = await documentosElectronicosRepository.getNumDocByAutorizar(req.body.rucEmpresa);
    
    if(responseQuery.isSucess == true && responseQuery.docRestantes >= req.body.list.length){
        const sendListDocElectronicosProm = documentosElectronicosRepository.autorizarListDocumentos(req.body.list, req.body.nombreBd);

        sendListDocElectronicosProm.then(
            function (result){
                res.status(200).send(result);
            },
            function(error){
                res.status(400).send(error);
            }
        );
    }else{
        res.status(400).send({
            isSuccess: false,
            isDenyAutorizar: true
        });
    }
    
});


module.exports = router;
