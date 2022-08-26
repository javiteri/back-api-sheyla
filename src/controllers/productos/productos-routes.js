var express = require('express');
var router = express.Router();
const productosRepository = require('./data/ProductosRepository');


router.get('/getProductosByIdEmp', async (req, res) => {

    const productosByIdEmpresa = productosRepository.getListProductosByIdEmp(req.query.idEmp);
    productosByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getProductoByIdEmp', async (req, res) => {

    const productoByIdEmpresa = productosRepository.getProductoByIdEmp(req.query.id, req.query.idEmp);
    productoByIdEmpresa.then(
        function(proveedor){
            res.status(200).send(proveedor);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;