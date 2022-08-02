var express = require('express');
var router = express.Router();
const clientData = require('clientesdata')

/* GET clientes data. */
router.get('/', (req, resp) => {
    clientData.getListClientes()
})