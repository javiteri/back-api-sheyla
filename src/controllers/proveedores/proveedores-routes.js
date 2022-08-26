var express = require('express');
var router = express.Router();
const proveedoresRepository = require('./data/ProveedoresRepository');

router.get('/getProveedoresByIdEmp', async (req, res) => {

    const proveedoresByIdEmpresa = proveedoresRepository.getListProveedoresByIdEmp(req.query.idEmp);
    proveedoresByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getProveedorByIdEmp', async (req, res) => {

    const proveedorByIdEmpresa = proveedoresRepository.getProveedorByIdEmp(req.query.id, req.query.idEmp);
    proveedorByIdEmpresa.then(
        function(proveedor){
            res.status(200).send(proveedor);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/insertar', async (req, res) => {
    const insertProveedorPromise = proveedoresRepository.insertProveedor(req.body);

    insertProveedorPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );

});

router.post('/update', async (req, res) => {
    const updateProveedorPromise = proveedoresRepository.updateProveedor(req.body);

    updateProveedorPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

router.post('/delete', async (req, res) => {

    const {idEmpresa, idProv} = req.body;
    
    const deleteProveedorPromise = proveedoresRepository.deleteProveedor(idEmpresa, idProv);

    deleteProveedorPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;