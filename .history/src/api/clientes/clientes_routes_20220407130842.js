var express = require('express');
var router = express.Router();
const clientData = require('clients_data_fake')

/* GET clientes data. */
router.get('/', (req, resp) => {
    clientData.getListClientes()
})