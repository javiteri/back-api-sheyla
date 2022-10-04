const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');

exports.getListProveedoresByIdEmp = async (idEmpresa) => {

    return new Promise((resolve, reject) => {
        try {
            
            let querySelectProveedoresByIdEmp = 'SELECT * FROM proveedores WHERE pro_empresa_id = ? ';
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
                observacion, telefono, celular, email, paginaWeb, direccion, identificacionRepre,
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
                                                    observacion?observacion : '', telefono, celular, email, paginaWeb, direccion?direccion:'', 
                                                    identificacionRepre ? identificacionRepre : '', nombreRepre, telefonoRepre, direccionRepre, emailRepre], 
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

                        insertClienteResponse['data'] = {
                            id: insertId,
                            ciRuc: documentoIdentidad,
                            nombre: nombreNatural,
                            email: email ? email : '',
                            direccion: direccion ? direccion : '',
                            telefono: telefono ? telefono : ''
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
                observacion, telefono, celular, email, paginaWeb, direccion, identificacionRepre,
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
                        observacion, telefono, celular, email, paginaWeb, direccion, identificacionRepre ? identificacionRepre : '', nombreRepre, telefonoRepre, 
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
                        tieneMovimientos: error.message.includes('a foreign key constraint fails') ? true : false
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

exports.searchProveedoresByIdEmp = async (idEmpresa, textSearch) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySearchClientes = `SELECT * FROM proveedores WHERE pro_empresa_id = ? AND (pro_nombre_natural LIKE ? || pro_documento_identidad LIKE ?)
                                         ORDER BY pro_id DESC`
            
            pool.query(querySearchClientes, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%'], (err, results) => {

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

exports.getListProveedoresExcel = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileProveedores(idEmpresa);
            valueResultPromise.then( 
                function (data) {
                    resolve(data);
                },
                function (error) {
                    resolve(error);
                }
            );
        }catch(exception){
            reject('error creando excel');
        }
    });
}

function createExcelFileProveedores(idEmp){

    return new Promise((resolve, reject) => {
        try{


            let querySelectProveedoresByIdEmp = 'SELECT * FROM proveedores WHERE pro_empresa_id = ? ';
            pool.query(querySelectProveedoresByIdEmp, [idEmp], function (error, results){

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: err
                    });
                    return;
                }
                
                
                console.log(results);    
                const arrayData = Array.from(results);

                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Lista Proveedores");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Identificacion', key:'identificacion', width: 20},
                    {header: 'Nombre', key:'nombre',width: 50},
                    {header: 'Email', key:'email',width: 40},
                    {header: 'Telefono', key:'telefono',width: 20},
                    {header: 'Observacion', key:'observacion',width: 40}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        identificacion: valor.pro_documento_identidad,
                        nombre: valor.pro_nombre_natural,
                        email: valor.pro_email,
                        telefono: valor.pro_telefono,
                        observacion: valor.pro_observacion
                    }
                    worksheet.addRow(valorInsert);
                });

                // Making first line in excel
                worksheet.getRow(1).eachCell((cell) => {
                    cell.font = {bold: true},
                    cell.border = {
                        top: {style:'thin'},
                        left: {style:'thin'},
                        bottom: {style:'thin'},
                        right: {style:'thin'}
                    }
                });

                try{

                    const nameFile = `/${Date.now()}_proveedores.xlsx`;
            
                    if(!fs.existsSync(`${path}`)){
                        fs.mkdir(`${path}`,{recursive: true}, (err) => {
                            if (err) {
                                return console.error(err);
                            }
            
                            workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            
                                resolve({
                                    isSucess: true,
                                    message: 'archivo creado correctamente',
                                    pathFile: `${path}${nameFile}`
                                });

                            });
                        });
                    }else{
                        
                        workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            resolve({
                                isSucess: true,
                                message: 'archivo creado correctamente',
                                pathFile: `${path}${nameFile}`
                            });
                        });
                    }
            
                }catch(exception){
                    console.log(`exception`);
                    console.log(exception);
            
                    reject({
                        isSucess: false,
                        error: 'error creando archivo, reintente'
                    });
                }

            });


        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}

