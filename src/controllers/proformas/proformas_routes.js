const express = require('express');
const router = express.Router();
const proformaRepository = require('./data/ProformaRepository')

router.get('/getProformasIdEmp', function(req, res) {

    const respListProformas = proformaRepository.getListProformasByIdEmpresa(req.query.idEmp, req.query.nombreBd);

    respListProformas.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

module.exports = router;