var express = require('express');
var router = express.Router();
const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', (req, res) => {
    res.send(clientData.getListClientes())
})

module.exports = router;