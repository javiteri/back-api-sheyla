var express = require('express');
var router = express.Router();
const usuarioRepository = require('./data/UsuariosRepository');

router.get('/getUsuariosByIdEmp', async (req, res) => {

    const usuariosByIdEmpresa = usuarioRepository.getListUsuariosByIdEmp(req.query.idEmp);
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

    const usuarioByIdEmpresa = usuarioRepository.getUsuarioByIdEmp(req.query.id, req.query.idEmp);
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

    const {idEmpresa, idUser} = req.body;
    
    const deleteUsuarioPromise = usuarioRepository.deleteUsuario(idEmpresa, idUser);

    deleteUsuarioPromise.then(
        function(result){
            res.status(200).send(result);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});


module.exports = router;
