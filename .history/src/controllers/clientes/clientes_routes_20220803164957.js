var express = require('express');
var router = express.Router();
const clienteRepository = require('./data/clienterepository')
//const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', async (req, res) => {
    

    const listClientes = await clienteRepository.getListClientes(100)

    console.log(listClientes.length())

    const responseObj = {
        //token: req.headers.authorization.split('Bearer')[1].trim(),// query.secret_token,
        isSucces: true,
        user: req.user,
        data: listClientes
    }

    res.send(responseObj)
}) 

module.exports = router;