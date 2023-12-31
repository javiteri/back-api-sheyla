const express = require('express')
const router = express.Router()
const {deleteFile} = require('../../util/sharedfunctions');
const ventasRepository = require('./data/VentasRepository');

router.post('/insertar', async (req, res, next) => {
    const resultInsertVentaProm = ventasRepository.insertVenta(req.body);
    resultInsertVentaProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/updateEstadoVenta', async(req, res, next) => {
    
    const resultUpdateEstadoVenta = ventasRepository.updateEstadoAnuladoVentaByIdEmpresa(req.body);
    resultUpdateEstadoVenta.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/deleteVenta', async(req, res, next) => {
    
    const resultDeleteEstadoVenta = ventasRepository.deleteVentaEstadoAnuladoByIdEmpresa(req.body);
    resultDeleteEstadoVenta.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/listaVentasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;
    let nombreBd = req.query.nombreBd;

    const listaVentasIdEmpProm = ventasRepository.getListVentasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin, nombreBd);
    listaVentasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/listaResumenVentasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;
    let nombreBd = req.query.nombreBd;

    const listaResumenVentasIdEmpProm = ventasRepository.getListResumenVentasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin, nombreBd);
    listaResumenVentasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/getorcreateconsfinalbyidemp', async(req, res, next) => {
    const getConsumidorFinalProm = ventasRepository.getOrCreateConsFinalByIdEmp(req.query.idEmp,req.query.nombreBd);
    getConsumidorFinalProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getNextNumeroSecuencialByIdEmp', async(req,res,next) => {
    const {idEmp, tipoDoc, fac001, fac002, nombreBd} = req.query;
    const nextSecuencialProm = 
            ventasRepository.getNextNumeroSecuencialByIdEmp(idEmp,tipoDoc,fac001,fac002,nombreBd);
    nextSecuencialProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/getNoPuntoVentaByIdUsr', async(req,res,next) => {
    const {idEmp, tipoDoc, idUsuario, nombreBd} = req.query;
    
    const nextSecuencialProm = 
            ventasRepository.getNoPuntoVentaSecuencialByIdusuarioAndEmp(idEmp,tipoDoc,idUsuario,nombreBd);
    nextSecuencialProm.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});


router.get('/getDataByIdVenta',async(req,res,next) => {
    const getDataByIdVentaPromise = 
            ventasRepository.getDataByIdVenta(req.query.id, req.query.idEmp, req.query.ruc,req.query.nombreBd);
    getDataByIdVentaPromise.then(
        function(results){
            res.status(200).send(results);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistventasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getListaVentasExcelPromise = ventasRepository.getListListaVentasExcel(idEmp,fechaIni,fechaFin,nombreCi,noDoc, nombreBd);

    getListaVentasExcelPromise.then(
        function (clientes){
            if(clientes.isSucess == false){
                res.status(200).send();
                return;
            }
            res.download(clientes['pathFile'],((error) => {
                deleteFile(clientes['pathFile']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistresumenventasexcel', async(req, res) => {
    
    const idEmp = req.query.idEmp;
    const nombreCi = req.query.ciname;
    const noDoc = req.query.nodoc;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;
    const nombreBd = req.query.nombreBd;

    const getListaVentasExcelPromise = ventasRepository.getListListaResumenVentasExcel(idEmp,fechaIni,fechaFin,nombreCi,noDoc,nombreBd);

    getListaVentasExcelPromise.then(
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

router.post('/importlistventas', async (req, res) => {

    const insertVentaPromise = ventasRepository.importListVentas(req.body.listVentas, req.body.nombreBd, req.body.idEmp);

    insertVentaPromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/gettemplateventasexcel', async(req, res) => {
    const getTemplateVentasExcelPromise = ventasRepository.getTemplateVentasExcel(req.query.idEmp, req.query.nombreBd);

    getTemplateVentasExcelPromise.then(
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