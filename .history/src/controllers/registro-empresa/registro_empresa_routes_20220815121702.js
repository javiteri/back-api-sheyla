const express = require('express');
const router = express.Router();
const empresaRepository = require('./EmpresaRepository');

router.post('/getEmpresaByRuc', function (req, res, next) {

    const {ruc, idEmpresa} = req.body;

    const resultQueryEmpresa = empresaRepository.getEmpresaByRuc(ruc, idEmpresa);

    resultQueryEmpresa.then(
        function(result){
            res.status(200).send(result);
        },
        function(eror){
            res.status(200).send({
                isSucess: true,
                error: eror 
            });
        }

    );

});

router.post('/updateempresa', function (req, res, next) {

    const {} = req.body;

    const resultQueryUpdateEmpresa = empresaRepository.updateDatosEmpresa(req.body);

    resultQueryUpdateEmpresa.then(
        function(result){

        },
        function(error){

            res.status(500).send({
                isSucess: false,
                error: error 
            });
        }
    );
});

module.exports = router;
