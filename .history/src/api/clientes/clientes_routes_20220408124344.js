var express = require('express');
var router = express.Router();
const clienteRepository = require('./data/clienterepository')
//const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', async (req, res) => {
    //const listClientes = clientData.getListClientes()
    const listClientes = await clienteRepository.getListClientes(100)
    const responseObj = {
        token: req.headers.authorization.split('Bearer')[1].trim(),// query.secret_token,
        user: req.user,
        clientes: listClientes
    }
    console.log(req.cookies)


    console.log(`${req.query}`)
    console.log(`${req}`)

    res.send(responseObj)
}) 

module.exports = router;