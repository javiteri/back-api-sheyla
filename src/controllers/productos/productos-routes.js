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

router.post('/insertar', async (req, res) => {
    const insertProductoPromise = productosRepository.insertPoducto(req.body);

    insertProductoPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );

});

router.post('/update', async (req, res) => {
    const updateProductoPromise = productosRepository.updateProducto(req.body);

    updateProductoPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

router.post('/delete', async (req, res) => {

    const {idEmpresa, idProducto} = req.body;
    
    const deleteProductoPromise = productosRepository.deleteProducto(idEmpresa, idProducto);

    deleteProductoPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getCategoriasByIdEmp', async (req, res) => {

    const categoriasProductoByIdEmpresa = productosRepository.getCategoriasByIdEmp(req.query.idEmp);
    categoriasProductoByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getMarcasByIdEmp', async (req, res) => {

    const marcasProductoByIdEmpresa = productosRepository.getMarcasByIdEmp(req.query.idEmp);
    marcasProductoByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/searchProductosByIdEmp', async (req, res) => {
    const searchProductosByIdEmpPromise = productosRepository.searchProductosByIdEmp(req.query.idEmp, req.query.textSearch);

    searchProductosByIdEmpPromise.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});


module.exports = router;