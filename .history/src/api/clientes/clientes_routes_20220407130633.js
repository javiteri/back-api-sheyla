var express = require('express');
var router = express.Router();
var clientRepository = require('clients_data_fake')

/* GET clientes data. */
router.get('/', (req, resp) => {
    clientRepository.getListClientes()
})