const express = require('express')
const router = express.Router()

const cajaRepository = require('./data/CajaRepository');

router.get('/listaResumenCajaIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let idUsuario = req.query.idUsu;
    let tipo = req.query.tipo;
    let concepto = req.query.concepto;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;

    const listaMovimientoCajaIdEmpProm = cajaRepository.getListResumenCajaByIdEmp(idEmp, idUsuario,tipo, concepto,fechaIni, fechaFin);
    listaMovimientoCajaIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/listcuadrecajamovimientosidemp', async(req,res,next) => {

    const idEmp = req.query.idEmp;
    const idUser = req.query.idUser;
    const fechaIni = req.query.fechaIni;
    const fechaFin = req.query.fechaFin;

    const listMovimientosCuadreCaja = cajaRepository.getListCuadreCajaMovimientosGrupo(idEmp, idUser,
        fechaIni, fechaFin);
    listMovimientosCuadreCaja.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.get('/getvalorcajabyidemp', async(req,res,next) => {

    const idEmp = req.query.idEmp;

    const valorCajaPromise = cajaRepository.getListValorCajaByIdEmp(idEmp);
    valorCajaPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    )
});

router.post('/cuadrarcaja', async(req, res, next) => {

    const resultInsertCuadreCajaProm = cajaRepository.insertCuadreCajaByIdEmp(req.body);    
    resultInsertCuadreCajaProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.post('/insertingresoegreso', async(req, res, next) => {

    const resultInsertIngresoEgresoProm = cajaRepository.insertBitacoraIngresoOrEgreso(req.body);    
    resultInsertIngresoEgresoProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

module.exports = router;