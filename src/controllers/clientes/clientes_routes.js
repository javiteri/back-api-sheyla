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

router.get('/getClienteIdEmp', async (req, res) => {
    const clienteByIdEmp = clienteRepository.getClienteByIdEmp(req.query.idCliente, req.query.idEmp);

    clienteByIdEmp.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getClientesIdEmp', async (req, res) => {

    const clientesByIdEmp = clienteRepository.getListClientesByIdEmp(req.query.idEmp);

    clientesByIdEmp.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/insertar', async (req, res) => {

    const insertClientePromise = clienteRepository.insertCliente(req.body);

    insertClientePromise.then(
        function(result) {
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/update', async (req, res) => {
    const updateCliente = clienteRepository.updateCliente(req.body);

    updateCliente.then(
        function(result) {
            console.log(result);
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/delete', async (req, res) => {

    const {idEmpresa, idCliente} = req.body;
    
    const deleteClientePromise = clienteRepository.deleteCliente(idEmpresa, idCliente);

    deleteClientePromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;