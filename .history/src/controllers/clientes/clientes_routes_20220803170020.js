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
            'nombre': element['cli_nombre'], 
            'tipo': element['cli_tipo_id'],
            'email': element['cli_email'],
            'telefono': element['cli_telefonos'],
            'nacionalidad': element['cli_nacionalidad']
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