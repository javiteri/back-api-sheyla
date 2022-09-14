const express = require('express')
const router = express.Router()

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

router.get('/listaVentasIdEmp', async(req, res, next) => {

    let idEmp = req.query.idEmp;
    let nombreCi = req.query.ciname;
    let noDoc = req.query.nodoc;
    let fechaIni = req.query.fechaini;
    let fechaFin = req.query.fechafin;

    const listaVentasIdEmpProm = ventasRepository.getListVentasByIdEmpresa(idEmp, nombreCi,noDoc, fechaIni, fechaFin);
    listaVentasIdEmpProm.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    )
});

module.exports = router;