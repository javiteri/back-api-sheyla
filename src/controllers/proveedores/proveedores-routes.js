var express = require('express');
var router = express.Router();
const fs = require('fs');
const proveedoresRepository = require('./data/ProveedoresRepository');

router.get('/getProveedoresByIdEmp', async (req, res) => {

    const proveedoresByIdEmpresa = proveedoresRepository.getListProveedoresByIdEmp(req.query.idEmp, req.query.nombreBd);
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

    const proveedorByIdEmpresa = proveedoresRepository.getProveedorByIdEmp(req.query.id, req.query.idEmp,req.query.nombreBd);
    proveedorByIdEmpresa.then(
        function(proveedor){
            res.status(200).send(proveedor);
        },
        function(error){
            res.status(200).send(error);
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

router.post('/importlistproveedores', async (req, res) => {

    const insertProveedoresPromise = proveedoresRepository.importListProveedores(req.body.listProveedores, req.body.nombreBd, req.body.idEmp);

    insertProveedoresPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
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

    const {idEmpresa, idProv, nombreBd} = req.body;
    
    const deleteProveedorPromise = proveedoresRepository.deleteProveedor(idEmpresa, idProv, nombreBd);

    deleteProveedorPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});


router.get('/searchProveedorByIdEmp', async (req, res) => {
    const searchProveedorByIdEmpPromise = proveedoresRepository.searchProveedoresByIdEmp(req.query.idEmp, req.query.textSearch, req.query.nombreBd);

    searchProveedorByIdEmpPromise.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            console.log(error);
            res.status(400).send(error);
        }
    );
});

router.get('/getlistproveedoresexcel', async(req, res) => {
    
    
    const getListClientesExcelPromise = proveedoresRepository.getListProveedoresExcel(req.query.idEmp,req.query.nombreBd);

    getListClientesExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
})

router.get('/gettemplateproveedoressexcel', async(req, res) => {
    const getTemplateProveedoresExcelPromise = proveedoresRepository.getTemplateProveedoresExcel(req.query.idEmp, req.query.nombreBd);

    getTemplateProveedoresExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
})


module.exports = router;