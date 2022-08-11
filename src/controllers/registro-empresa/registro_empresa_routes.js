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

module.exports = router;
