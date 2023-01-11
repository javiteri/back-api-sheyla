var express = require('express');
var router = express.Router();
var fs = require('fs');
const clienteRepository = require('./data/clienterepository')

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
    const clienteByIdEmp = clienteRepository.getClienteByIdEmp(req.query.idCliente, req.query.idEmp, req.query.nombreBd);

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

    const clientesByIdEmp = clienteRepository.getListClientesByIdEmp(req.query.idEmp, req.query.nombreBd);

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

router.post('/importlistclientes', async (req, res) => {

    const insertClientePromise = clienteRepository.importListClientes(req.body.listClientes, req.body.nombreBd, req.body.idEmp);

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
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/delete', async (req, res) => {

    const {idEmpresa, idCliente, nombreBd} = req.body;
    
    const deleteClientePromise = clienteRepository.deleteCliente(idEmpresa, idCliente, nombreBd);

    deleteClientePromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/searchClienteByIdEmp', async (req, res) => {
    const searchClientesByIdEmpPromise = clienteRepository.searchClientesByIdEmp(req.query.idEmp, req.query.textSearch, req.query.nombreBd);

    searchClientesByIdEmpPromise.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistclientesexcel', async(req, res) => {
    const getListClientesExcelPromise = clienteRepository.getListClientesExcel(req.query.idEmp, req.query.nombreBd);

    getListClientesExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
});
router.get('/gettemplateclientesexcel', async(req, res) => {
    const getTemplateClientesExcelPromise = clienteRepository.getTemplateClientesExcel(req.query.idEmp, req.query.nombreBd);

    getTemplateClientesExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {

                fs.unlink(clientes['pathFile'], function(){
                    console.log("File was deleted") // Callback
                });
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
})


module.exports = router;