const pool = require('../../../connectiondb/mysqlconnection');

exports.getUsuarioByIdEmp = async (idUser, idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectClientes = `SELECT * FROM usuarios WHERE usu_empresa_id = ? AND usu_id = ? LIMIT 1`
            
            pool.query(querySelectClientes, [idEmpresa, idUser], (err, results) => {

                if(err){
                    reject({
                        isSucess: false,
                        code: 400,
                        message: err
                    });
                    return;
                }
                
                if(!results | results == undefined | results == null | !results.length){
                    resolve({
                        isSucess: true,
                        code: 400,
                        message: 'no se encontro usuario'
                    });

                    return;
                }

                resolve({
                    isSucess: true,
                    code: 200,
                    data: results
                });

            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.getListUsuariosByIdEmp = async (idEmpresa) => {

    return new Promise((resolve, reject) => {
        try {
            
            let querySelectUsuariosByIdEmp = 'SELECT * FROM usuarios WHERE usu_empresa_id = ? ';
            pool.query(querySelectUsuariosByIdEmp, [idEmpresa], function (error, results, fields){

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: err
                    });
                    return;
                }

                resolve({
                    isSucess: true,
                    code: 200,
                    data: results
                });


            });
        }catch(err) {
            reject({
                isSucess: false,
                code: 400,
                messageError: err
            });
        }
    });
} 

exports.insertUsuario = async (datosCliente) => {
    return new Promise((resolve, reject ) => {
        try{

            const {idEmpresa, identificacion, nombreNatural, telefono, direccion,
                    email, fechaNacimiento, nombreUsuario, password, permisoEscritura} = datosCliente;

            let queryExistUsuario = "SELECT COUNT(*) AS CANT FROM usuarios WHERE usu_empresa_id = ? AND usu_identificacion = ?";
            let queryInsertUser = `INSERT INTO usuarios (usu_empresa_id, usu_nombres, usu_identificacion, usu_telefonos, usu_direccion, usu_mail,
                                        usu_fecha_nacimiento, usu_username, usu_password, usu_permiso_escritura) 
                                        VALUES (?,?,?,?,?,?,?,?,?,?)`;
            
            pool.query(queryExistUsuario, [idEmpresa, identificacion], function(error, result, fields){
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: error
                    });
                    return;
                }

                const cantUsers = result[0].CANT;
                if(cantUsers >= 1){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'Ya existe el Usuario',
                        duplicate: true
                    });
                    return;
                }

                pool.query(queryInsertUser, [idEmpresa, nombreNatural, identificacion, telefono, direccion?direccion:'', email, fechaNacimiento, 
                                            nombreUsuario, password, permisoEscritura], 
                    function (error, result){
                        if(error){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: error
                            });
                            return;
                        }

                        const insertId = result.insertId;
                        let insertClienteResponse = {}
                        if(insertId > 0){
                        insertClienteResponse['isSucess'] = true;
                        }else{
                        insertClienteResponse['isSucess'] = false;
                        insertClienteResponse['message'] = 'error al insertar Usuario';
                        }

                        resolve(insertClienteResponse);
                });

            });

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.updateUsuario = async (datosUsuarioUpdate) => {
    return new Promise((resolve, reject) => {
        try{

            const {idUsuario, idEmpresa, identificacion, nombreNatural, telefono, direccion,
                email, fechaNacimiento, nombreUsuario, password, permisoEscritura} = datosUsuarioUpdate;
            
            let queryExistUser = "SELECT COUNT(*) AS CANT FROM usuarios WHERE usu_empresa_id = ? AND usu_identificacion = ?";
            let queryUpdateUsuario = `UPDATE usuarios SET usu_empresa_id = ?, usu_nombres = ?,
                                                 usu_telefonos = ?, usu_direccion = ?, usu_mail = ? , usu_fecha_nacimiento = ? ,
                                                 usu_username = ?, usu_password = ?, usu_permiso_escritura = ? WHERE usu_empresa_id = ? AND usu_id = ?`;
            
            pool.query(queryExistUser, [idEmpresa, identificacion], function(error, result, fields){
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        message: error.message
                    });
                    return;
                }

                const cantClients = result[0].CANT;
                if(cantClients == 0){
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'No existe Usuario',
                        duplicate: true
                    });
                    return;
                }

                if(cantClients == 1){
                    
                    pool.query(queryUpdateUsuario, [idEmpresa, nombreNatural, telefono, direccion, email, fechaNacimiento,
                        nombreUsuario, password, permisoEscritura, idEmpresa, idUsuario], 
                        function (error, result){
    
                            if(error){
                                reject({
                                    isSucess: false,
                                    code: 400,
                                    message: error
                                });
                                return;
                            }
    
                            const insertId = result.affectedRows;
                            let insertClienteResponse = {}
                            if(insertId > 0){
                                insertClienteResponse['isSucess'] = true;
                            }else{
                                insertClienteResponse['isSucess'] = false;
                                insertClienteResponse['message'] = 'error al actualizar usuario';
                            }
    
                            resolve(insertClienteResponse);
                            return;
                    });
                }else{
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'identificacion ya esta en uso',
                        duplicate: true
                    });
                    return;
                }
                
            });

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.deleteUsuario = async (idEmpresa, idUser) => {
    return new Promise((resolve, reject) => {
        try {
            let queryDeleteUsuario = 'DELETE FROM usuarios WHERE usu_empresa_id = ? AND usu_id = ? LIMIT 1';

            pool.query(queryDeleteUsuario, [idEmpresa, idUser], function(error, results, fields){
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        message: error.message
                    });
                    return;
                }

                const affectedRows = results.affectedRows;
                if(affectedRows === 1){

                    const deleteUsuarioResponse = {
                        'isSucess': true
                    }
    
                    resolve(deleteUsuarioResponse);
                    return;

                }else{
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'error al eliminar usuario, reintente',
                        duplicate: true
                    });
                    return;
                }
            });

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.searchUsuariosByIdEmp = async (idEmpresa, textSearch) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySearchUsuarios = `SELECT * FROM usuarios WHERE usu_empresa_id = ? AND (usu_nombres LIKE ? || usu_identificacion LIKE ?)
                                         ORDER BY usu_id DESC`
            
            pool.query(querySearchUsuarios, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%'], (err, results) => {

                if(err){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: err
                    });
                    return;
                }
                
                resolve({
                    isSucess: true,
                    code: 200,
                    data: results
                });

            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}