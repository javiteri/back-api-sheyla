const express = require('express');
const router = express.Router();
const establecimientoRepository = require('./data/EstablecimientosRepository');
const fs = require('fs');

router.post('/guardarestablecimiento', async (req, res, next) => {

    const resultQueryUpdateEmpresa = establecimientoRepository.guardarDatosEstablecimiento(req.body);

    resultQueryUpdateEmpresa.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            console.log('inside error insert datos establecimiento: ' + error);
            res.status(500).send({
                isSucess: false,
                error: error 
            });
        }
    );
});


router.get('/getEstablecimientosByIdEmp', async (req, res) => {

    const establecimientosByIdEmpresa = establecimientoRepository.getEstablecimientosByIdEmp(req.query.idEmp, req.query.nombreBd);
    establecimientosByIdEmpresa.then(
        function(proveedor){
            res.status(200).send(proveedor);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;
