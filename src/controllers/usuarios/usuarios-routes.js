const express = require('express');
const router = express.Router();
const {deleteFile} = require('../../util/sharedfunctions');
const usuarioRepository = require('./data/UsuariosRepository');


router.get('/getUsuariosByIdEmp', async (req, res) => {

    const usuariosByIdEmpresa = usuarioRepository.getListUsuariosByIdEmp(req.query.idEmp,req.query.nombreBd);
    usuariosByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getUsuarioByIdEmp', async (req, res) => {

    const usuarioByIdEmpresa = usuarioRepository.getUsuarioByIdEmp(req.query.id, req.query.idEmp, req.query.nombreBd);
    usuarioByIdEmpresa.then(
        function(usuarios){
            res.status(200).send(usuarios);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.post('/insertar', async (req, res) => {
    const insertUsuarioPromise = usuarioRepository.insertUsuario(req.body);

    insertUsuarioPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );

});

router.post('/update', async (req, res) => {
    const updateUsuarioPromise = usuarioRepository.updateUsuario(req.body);

    updateUsuarioPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error) {
            res.status(400).send(error);
        }
    );
});

router.post('/delete', async (req, res) => {

    const {idEmpresa, idUser, nombreBd} = req.body;
    
    const deleteUsuarioPromise = usuarioRepository.deleteUsuario(idEmpresa, idUser, nombreBd);

    deleteUsuarioPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(200).send(error);
        }
    );
});

router.get('/searchUsuariosByIdEmp', async (req, res) => {
    const searchProductosByIdEmpPromise = usuarioRepository.searchUsuariosByIdEmp(req.query.idEmp, req.query.textSearch,req.query.nombreBd);

    searchProductosByIdEmpPromise.then(
        function (clientes){
            res.status(200).send(clientes);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/getlistusersexcel', async(req, res) => {
    const getListUserExcelPromise = usuarioRepository.getListUsersExcel(req.query.idEmp, req.query.nombreBd);

    getListUserExcelPromise.then(
        function (clientes){
            res.download(clientes['pathFile'],((error) => {
                deleteFile(clientes['pathFile']);
            }));
        },
        function(error){
            res.status(400).send(error);
        }
    );
})



module.exports = router;
