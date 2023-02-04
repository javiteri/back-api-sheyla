const express = require('express');
const router = express.Router();
const empresaRepository = require('./EmpresaRepository');
const {deleteFile} = require('../../util/sharedfunctions');

router.post('/getEmpresaByRuc', async (req, res, next) =>{

    const {ruc, idEmpresa, nombreBd} = req.body;

    const resultQueryEmpresa = empresaRepository.getEmpresaByRuc(ruc, idEmpresa, nombreBd);

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

router.post('/updateempresa', async (req, res, next) => {

    const resultQueryUpdateEmpresa = empresaRepository.updateDatosEmpresa(req.body);

    resultQueryUpdateEmpresa.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            console.log('inside error update datos Empresa: ' + error);
            res.status(500).send({
                isSucess: false,
                error: error 
            });
        }
    );
});

router.get('/getimagenlogobyrucempresa', async(req, res, next) =>{
    const getImageLogoByRucEmpresa = empresaRepository.getImagenLogoByRucEmp(req.query.ruc);
    getImageLogoByRucEmpresa.then(
        function(data){
            res.download(data['path'],((error) => {
                deleteFile(data['path']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;
