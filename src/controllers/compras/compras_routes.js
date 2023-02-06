const express = require('express');
const router = express.Router();
const {deleteFile} = require('../../util/sharedfunctions');
const comprasRepository = require('./data/ComprasRepository');


router.get('/listaComprasByIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;
    let nombreBd = req.query.nombreBd;

    const listaComprasIdEmpProm = comprasRepository.getListComprasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin, nombreBd);
    listaComprasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/listaResumenComprasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;
    let nombreBd = req.query.nombreBd;

    const listaResumenComprasIdEmpProm = comprasRepository.getListResumenComprasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin, nombreBd);
    listaResumenComprasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.post('/insertar', async (req, res, next) => {

    const resultInsertCompraProm = comprasRepository.insertCompra(req.body);
    resultInsertCompraProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getorcreateprovgenericobyidemp', async(req, res, next) => {
    const getProveedorGenericoProm = comprasRepository.getOrCreateProveedorGenericoByIdEmp(req.query.idEmp,req.query.nombreBd);
    getProveedorGenericoProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getNextNumeroSecuencialByIdEmp', async(req,res,next) => {
    const {idEmp, tipoDoc, idProveedor,compraNumero, nombreBd} = req.query;
    const nextSecuencialProm = 
            comprasRepository.getNextNumeroSecuencialByIdEmp(idEmp,tipoDoc,idProveedor,compraNumero, nombreBd);
    nextSecuencialProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/deleteCompra', async(req, res, next) => {
    
    const resultDeleteCompra = comprasRepository.deleteCompraByIdEmpresa(req.body);
    resultDeleteCompra.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getDataByIdCompra',async(req,res,next) => {
    const getDataByIdCompraPromise = 
            comprasRepository.getDataByIdCompra(req.query.id, req.query.idEmp,req.query.nombreBd);
    getDataByIdCompraPromise.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistcomprasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getListaComprasExcelPromise = comprasRepository.getListaComprasExcel(idEmp,fechaIni,fechaFin,nombreCi,noDoc, nombreBd);

    getListaComprasExcelPromise.then(
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

router.get('/getlistresumencomprasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getListaComprasExcelPromise = comprasRepository.getListaResumenComprasExcel(idEmp,fechaIni,fechaFin,nombreCi,noDoc, nombreBd);

    getListaComprasExcelPromise.then(
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


router.post('/verifylistproductxml', async (req, res) => {
    let idEmpresa = req.body.idEmp;
    let listProducts = req.body.listProducts;
    let nombreBd = req.body.nombreBd;

    const resultVerifyProducts = comprasRepository.verifyListProductXml(idEmpresa, listProducts, nombreBd);
    resultVerifyProducts.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getxmlsoapservice', async(req, res) => {
    const resultXmlSoapService = comprasRepository.getXmlSoapService(req.query.autorizacion);
    resultXmlSoapService.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/generatepdfxmlcompra', async(req, res) => {
    
    const generatePdfVentaPromise = comprasRepository.generateDownloadPdfFromVentaByXmlData(req.body);

    generatePdfVentaPromise.then(
        function(response){
            res.download(response['generatePath'],((error) => {
                if(error){
                }
                deleteFile(response['generatePath']);
            }));

        },
        function(error){
            res.status(400).send(error);
        }
    );
});


module.exports = router;
