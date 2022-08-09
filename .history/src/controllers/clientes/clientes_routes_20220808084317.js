var express = require('express');
var router = express.Router();
const clienteRepository = require('./data/clienterepository')
//const clientData = require('../../util/clientesdata')

/* GET clientes data. */
router.get('/', async (req, res) => {
    
    var listClientesMap = new Array()

    var responseObj = {
        //token: req.headers.authorization.split('Bearer')[1].trim(),// query.secret_token,
        isSucces: true,
        user: req.user,
        data: listClientesMap//listClientes
    }


    const listClientes = await clienteRepository.getListClientes(100)


    try{

        listClientes.forEach(element => {
            listClientesMap.push({
                'id': element['cli_id'],
                'idEmpresa': element['cli_empresa_id'], 
                'nacionalidad': element['cli_nacionalidad'],
                'documentoIdentidad': element['cli_documento_identidad'],
                'tipoDocumentoIdentidad': element['cli_tipo_documento_identidad'],
                'nombresNatural': element['cli_nombres_natural'],
                'razonSocial': element['cli_razon_social'],
                'observacion': element['cli_observacion'],
                'fechaNacimiento': element['cli_fecha_nacimiento'],
                'telefono': element['cli_teleono'],
                'celular': element['cli_celular'],
                'email': element['cli_email'],
                'direccion': element['cli_direccion'],
                'profesion': element['cli_profesion']
            })
        });

    }catch(e){
        responseObj.isSucces = false;
    }


    res.send(responseObj);
}) 

module.exports = router;