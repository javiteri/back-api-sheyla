var express = require('express');
const res = require('express/lib/response');
var router = express.Router();
const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', (req, resp) => {
    res.send(clientData.getListClientes())
})

module.exports = router;