var express = require('express');
var router = express.Router();
const clienteRepository = require('./data/clienterepository')
//const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', async (req, res) => {
    //const listClientes = clientData.getListClientes()
    res.send(listClientes)
}) 

module.exports = router;