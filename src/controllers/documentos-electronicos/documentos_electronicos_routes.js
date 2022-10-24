var express = require('express');
var router = express.Router();
const fs = require('fs');
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

router.get('/autorizardocumentoelectronico', async (req, res) => {

    const {idEmp, idVentaCompra,identificacion,tipo} = req.query;
    const documentosElectronicosProm = documentosElectronicosRepository.atorizarDocumentoElectronico(idEmp, idVentaCompra,
        identificacion,tipo);
    documentosElectronicosProm.then(
        function(result) {
            fs.unlink(result.pathFile, function(){
                console.log("File was deleted") // Callback
                res.status(200).send(result);
            });
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

router.get('/generatepdffromventa', async(req, res) => {
    const {idEmp,idVentaCompra,identificacion} = req.query;
    const generatePdfVentaPromise = documentosElectronicosRepository.generateDownloadPdfFromVenta(idEmp,idVentaCompra,identificacion, true);

    generatePdfVentaPromise.then(
        function(response){
            res.download(response['generatePath'],((error) => {
                if(error){
                }
                fs.unlink(response['generatePath'], function(){
                    console.log("File was deleted") // Callback
                });
            }));

        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistdocumentoselectronicosexcel', async(req, res) => {
    
    const getListDocElectronicosExcelPromise = documentosElectronicosRepository.getListDocElectronicosExcel(req.query);;

    getListDocElectronicosExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            console.log('error');
            console.log(error);
            res.status(400).send(error);
        }
    );
})


module.exports = router;
