var express = require('express');
var router = express.Router();
const clienteRepository = require('./data/clienterepository')
//const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', async (req, res) => {
    

    const listClientes = await clienteRepository.getListClientes(100)

    var listClientesMap = new Array()

    listClientes.forEach(element => {
        listClientesMap.push({
            'ci': element['cli_cedula'],
            'nombre': element['cli_cedula'], 
            'tipo': element['cli_cedula'],
            'email': element['cli_cedula'],
            'telefono': element['cli_cedula'],
            'nacionalidad': element['cli_cedula']
        })
    });

    console.log(listClientesMap)

    const responseObj = {
        //token: req.headers.authorization.split('Bearer')[1].trim(),// query.secret_token,
        isSucces: true,
        user: req.user,
        data: listClientes
    }

    res.send(responseObj)
}) 

module.exports = router;