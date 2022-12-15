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

router.post('/actualizarestablecimiento', async (req, res, next) => {

    const resultQueryUpdateEmpresa = establecimientoRepository.actualizarDatosEstablecimiento(req.body);

    resultQueryUpdateEmpresa.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            console.log('inside error update datos establecimiento: ' + error);
            res.status(500).send({
                isSucess: false,
                error: error 
            });
        }
    );
});

router.get('/getEstablecimientoByIdEmpNumeroEst', async (req, res) => {

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

router.get('/getEstablecimientoByIdEmp', async (req, res) => {

    const establecimientoByIdEmpresa = establecimientoRepository.getEstablecimientoByIdEmp(req.query.idEmp, req.query.idEst, req.query.nombreBd);
    establecimientoByIdEmpresa.then(
        function(proveedor){
            res.status(200).send(proveedor);
        },
        function(error){
            res.status(400).send(error);
        }
    );

});


router.get('/getimagenlogobyrucempresaestablec', async(req, res, next) =>{
    const getImageLogoByRucEmpresa = establecimientoRepository.getImagenLogoByRucEmp(req.query.ruc);
    getImageLogoByRucEmpresa.then(
        function(data){
            res.download(data['path'],((error) => {

                fs.unlink(data['path'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/delete', async (req, res) => {

    const {idEmpresa, idEstablecimiento, nombreBd} = req.body;
    
    const deleteEstablecimientoPromise = establecimientoRepository.deleteEstablecimiento(idEmpresa, idEstablecimiento, nombreBd);

    deleteEstablecimientoPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});


module.exports = router;
