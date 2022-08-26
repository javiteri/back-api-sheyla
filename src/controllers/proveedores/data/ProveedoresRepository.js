const pool = require('../../../connectiondb/mysqlconnection');

exports.getListProveedoresByIdEmp = async (idEmpresa) => {

    return new Promise((resolve, reject) => {
        try {
            
            let querySelectProveedoresByIdEmp = 'SELECT * FROM proveedores WHERE pro_empresa_id = ?';
            pool.query(querySelectProveedoresByIdEmp, [idEmpresa], function (error, results, fields){

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

exports.getProveedorByIdEmp = async (idProv, idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectProveedor = `SELECT * FROM proveedores WHERE pro_empresa_id = ? AND pro_id = ? LIMIT 1`
            
            pool.query(querySelectProveedor, [idEmpresa, idProv], (err, results) => {

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
                        message: 'no se encontro proveedor'
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

exports.insertProveedor = async (datosProveedor) => {
    return new Promise((resolve, reject ) => {
        try{

            const {idEmpresa, tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                observacion, telefono, celular, email, paginaWeb, direccion, cedulaRepre,
                nombreRepre, telefonoRepre, direccionRepre, emailRepre} = datosProveedor;
            
            let queryExistProveedor = "SELECT COUNT(*) AS CANT FROM proveedores WHERE pro_empresa_id = ? AND pro_documento_identidad = ?";
            let queryInsertProveedor = `INSERT INTO proveedores (pro_empresa_id, pro_tipo_documento_identidad, pro_documento_identidad, 
            pro_nombre_natural, pro_razon_social, pro_observacion, pro_telefono, pro_celular, pro_email, 
            pro_pagina_web, pro_direccion, pro_cedula_representante, pro_nombre_presentante, pro_telefonos_representante, 
            pro_direccion_representante, pro_mail_representante) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                                        
            pool.query(queryExistProveedor, [idEmpresa, documentoIdentidad], function(error, result, fields){
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
                        messageError: 'Ya existe Proveedor',
                        duplicate: true
                    });
                    return;
                }

                pool.query(queryInsertProveedor, [idEmpresa, tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                                                    observacion, telefono, celular, email, paginaWeb, direccion, 
                                                    cedulaRepre ? cedulaRepre : '', nombreRepre, telefonoRepre, direccionRepre, emailRepre], 
                    function (error, result){
                        console.log(error);
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
                        insertClienteResponse['message'] = 'error al insertar Proveedor';
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

exports.updateProveedor = async (datosProveedor) => {
    return new Promise((resolve, reject) => {
        try{

            const {idProveedor, idEmpresa, tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                observacion, telefono, celular, email, paginaWeb, direccion, cedulaRepre,
                nombreRepre, telefonoRepre, direccionRepre, emailRepre} = datosProveedor;
            
            let queryExistProveedor = "SELECT COUNT(*) AS CANT FROM proveedores WHERE pro_empresa_id = ? AND pro_documento_identidad = ?";
            let queryUpdateProveedor = `UPDATE proveedores SET pro_tipo_documento_identidad = ?, pro_documento_identidad = ?, 
                                    pro_nombre_natural = ?, pro_razon_social = ?, pro_observacion = ?, pro_telefono = ?, pro_celular = ?, 
                                    pro_email = ?, pro_pagina_web = ?, pro_direccion = ?, pro_cedula_representante = ?, 
                                    pro_nombre_presentante = ?, pro_telefonos_representante = ?, 
                                    pro_direccion_representante = ?, pro_mail_representante = ? WHERE pro_empresa_id = ? AND pro_id = ?`;
            
            pool.query(queryExistProveedor, [idEmpresa, documentoIdentidad], function(error, result, fields){
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
                        message: 'No existe Proveedor',
                        duplicate: true
                    });
                    return;
                }

                if(cantClients == 1){
                    
                    pool.query(queryUpdateProveedor, [tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                        observacion, telefono, celular, email, paginaWeb, direccion, cedulaRepre ? cedulaRepre : '', nombreRepre, telefonoRepre, 
                        direccionRepre, emailRepre, idEmpresa, idProveedor], 
                        function (error, result){
    
                            if(error){
                                console.log(error);

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
                                insertClienteResponse['message'] = 'error al actualizar proveedor';
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

exports.deleteProveedor = async (idEmpresa, idProv) => {
    return new Promise((resolve, reject) => {
        try {
            let queryDeleteProveedor = 'DELETE FROM proveedores WHERE pro_empresa_id = ? AND pro_id = ? LIMIT 1';

            pool.query(queryDeleteProveedor, [idEmpresa, idProv], function(error, results, fields){
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

                    const deleteProveedorResponse = {
                        'isSucess': true
                    }
    
                    resolve(deleteProveedorResponse);
                    return;

                }else{
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'error al eliminar proveedor, reintente',
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