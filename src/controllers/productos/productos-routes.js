const express = require('express');
const router = express.Router();
const {deleteFile} = require('../../util/sharedfunctions');
const productosRepository = require('./data/ProductosRepository');


router.get('/getProductosByIdEmp', async (req, res) => {

    const productosByIdEmpresa = productosRepository.getListProductosByIdEmp(req.query.idEmp, req.query.nombreBd);
    productosByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getProductosNoAnuladoByIdEmp', async (req, res) => {
    const productosByIdEmpresa = productosRepository.getListProductosNoAnuladoByIdEmp(req.query.idEmp, req.query.nombreBd);
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

    const productoByIdEmpresa = productosRepository.getProductoByIdEmp(req.query.id, req.query.idEmp, req.query.nombreBd);
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

router.post('/importlistproductos', async (req, res) => {

    const insertProductoPromise = productosRepository.importListProductos(req.body.listProductos, req.body.nombreBd, req.body.idEmp);

    insertProductoPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
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

    const {idEmpresa, idProducto, nombreBd} = req.body;
    
    const deleteProductoPromise = productosRepository.deleteProducto(idEmpresa, idProducto, nombreBd);

    deleteProductoPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getCategoriasByIdEmp', async (req, res) => {

    const categoriasProductoByIdEmpresa = productosRepository.getCategoriasByIdEmp(req.query.idEmp, req.query.nombreBd);
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

    const marcasProductoByIdEmpresa = productosRepository.getMarcasByIdEmp(req.query.idEmp, req.query.nombreBd);
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
    const searchProductosByIdEmpPromise = productosRepository.searchProductosByIdEmp(req.query.idEmp, req.query.textSearch, req.query.nombreBd);

    searchProductosByIdEmpPromise.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/searchProductosByIdEmpActivo', async (req, res) => {
    const searchProductosByIdEmpPromise = productosRepository.searchProductosByIdEmpActivo(req.query.idEmp, req.query.textSearch,req.query.nombreBd);

    searchProductosByIdEmpPromise.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistproductosexcel', async(req, res) => {
    
    const getListProductosExcelPromise = productosRepository.getListProductosExcel(req.query.idEmp, req.query.nombreBd);

    getListProductosExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {
                deleteFile(clientes['pathFile']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/gettemplateproductosexcel', async(req, res) => {
    const getTemplateProductosExcelPromise = productosRepository.getTemplateProductosExcel(req.query.idEmp, req.query.nombreBd);

    getTemplateProductosExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {
                deleteFile(clientes['pathFile']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});


module.exports = router;