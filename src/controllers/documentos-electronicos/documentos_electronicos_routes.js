var express = require('express');
var router = express.Router();
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
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

module.exports = router;
