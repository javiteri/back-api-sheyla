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

router.get('/autorizardocumentoelectronico', async (req, res) => {

    const {idEmp, idVentaCompra,identificacion,tipo, estado} = req.query;
    
    const documentosElectronicosProm = 
        documentosElectronicosRepository.atorizarDocumentoElectronico(idEmp, idVentaCompra,identificacion,tipo,estado);
    documentosElectronicosProm.then(
        function(result) {
            if(result.pathFile){
                fs.unlink(result.pathFile, function(){
                    console.log('inside delete file ');
                    res.status(200).send(result);
                });
            }else{
                res.status(200).send(result);
            }      
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
    
    const getListDocElectronicosExcelPromise = documentosElectronicosRepository.getListDocElectronicosExcel(req.query);

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

router.post('/autorizarlistdocumentosbyid', async (req, res) => {
    const responseQuery = await documentosElectronicosRepository.getNumDocByAutorizar(req.body.rucEmpresa)
    
    if(responseQuery.isSucess == true && responseQuery.docRestantes >= req.body.list.length){
        const sendListDocElectronicosProm = documentosElectronicosRepository.autorizarListDocumentos(req.body);

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
