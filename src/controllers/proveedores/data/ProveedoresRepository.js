const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');

exports.getListProveedoresByIdEmp = async (idEmpresa,nombreBd) => {

    return new Promise(async (resolve, reject) => {
        try {
            let querySelectProveedoresByIdEmp = `SELECT * FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? ORDER BY pro_id DESC LIMIT 200`;
            let results = await pool.query(querySelectProveedoresByIdEmp, [idEmpresa]);
            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
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

exports.getProveedorByIdEmp = async (idProv, idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{
            let querySelectProveedor = `SELECT * FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? AND pro_id = ? LIMIT 1`
            
            let results = await pool.query(querySelectProveedor, [idEmpresa, idProv]); 
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
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
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.insertProveedor = async (datosProveedor) => {
    return new Promise(async (resolve, reject ) => {
        try{

            const {idEmpresa, tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                observacion, telefono, celular, email, paginaWeb, direccion, identificacionRepre,
                nombreRepre, telefonoRepre, direccionRepre, emailRepre, nombreBd} = datosProveedor;
            
            let queryExistProveedor = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? AND pro_documento_identidad = ?`;
            let queryInsertProveedor = `INSERT INTO ${nombreBd}.proveedores (pro_empresa_id, pro_tipo_documento_identidad, pro_documento_identidad, 
            pro_nombre_natural, pro_razon_social, pro_observacion, pro_telefono, pro_celular, pro_email, 
            pro_pagina_web, pro_direccion, pro_cedula_representante, pro_nombre_presentante, pro_telefonos_representante, 
            pro_direccion_representante, pro_mail_representante) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                                        
            let result = await pool.query(queryExistProveedor, [idEmpresa, documentoIdentidad]); 

            const cantUsers = result[0][0].CANT;
            if(cantUsers >= 1){
                reject({
                    isSucess: false,
                    code: 400,
                    messageError: 'Ya existe Proveedor',
                    duplicate: true
                });
                return;
            }

            let results = await pool.query(queryInsertProveedor, [idEmpresa, tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                observacion?observacion : '', telefono, celular, email, paginaWeb, direccion?direccion:'', 
                identificacionRepre ? identificacionRepre : '', nombreRepre, telefonoRepre, direccionRepre, emailRepre]);

            const insertId = results[0].insertId;
            let insertproveedorResponse = {}
            if(insertId > 0){
                insertproveedorResponse['isSucess'] = true;
            }else{
                insertproveedorResponse['isSucess'] = false;
                insertproveedorResponse['message'] = 'error al insertar Proveedor';
            }

            insertproveedorResponse['data'] = {
                id: insertId,
                ciRuc: documentoIdentidad,
                nombre: nombreNatural,
                email: email ? email : '',
                direccion: direccion ? direccion : '',
                telefono: telefono ? telefono : ''
            }

            resolve(insertproveedorResponse);
        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.importListProveedores = async (listProveedores, nombreBd, idEmpresa) => {
    return new Promise(async (resolve, reject ) => {
        try{
            let listProveedoresWithError = [];

            const selectExistProveedor = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.proveedores WHERE pro_documento_identidad = ? AND pro_empresa_id = ?`;
            const queryInsertProveedor = `INSERT INTO ${nombreBd}.proveedores (pro_empresa_id, pro_tipo_documento_identidad, pro_documento_identidad, 
                pro_nombre_natural, pro_razon_social, pro_observacion, pro_telefono, pro_celular, pro_email, 
                pro_pagina_web, pro_direccion, pro_cedula_representante, pro_nombre_presentante, pro_telefonos_representante, 
                pro_direccion_representante, pro_mail_representante) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            
            for(let index=0; index<listProveedores.length; index++){

                let proveedor = listProveedores[index];

                try{
                    let existProveedorResult = await pool.query(selectExistProveedor, [proveedor.pro_documento_identidad, proveedor.pro_empresa_id]);
                    
                    const cantProveedores = existProveedorResult[0][0].CANT;
                    if(cantProveedores >= 1){
                        let proveedorRes = proveedor;
                        proveedorRes.messageError = 'ya existe el proveedor';
                        proveedorRes.pro_error_server = true;
                        listProveedoresWithError.push(proveedorRes);
                    }else{
                        await pool.query(queryInsertProveedor, [
                            idEmpresa, proveedor.pro_tipo_documento_identidad, proveedor.pro_documento_identidad, proveedor.pro_nombre_natural, 
                            proveedor.pro_razon_social, 
                            proveedor.pro_observacion, proveedor.pro_telefono, proveedor.pro_celular, proveedor.pro_email, proveedor.pro_pagina_web, 
                            proveedor.pro_direccion, 
                            proveedor.pro_cedula_representante, proveedor.pro_nombre_presentante, proveedor.pro_telefonos_representante, 
                            proveedor.pro_direccion_representante, proveedor.pro_mail_representante
                        ]);
                    }
                    
                    if(listProveedores.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'Proveedors Insertados Correctamente',
                            listProveedoresWithError: listProveedoresWithError
                        });
                    }

                }catch(exception){
                    let proveedorRes = proveedor;
                    proveedorRes.messageError = 'error al insertar proveedor';
                    proveedorRes.cli_error_server = true;
                    listProveedoresWithError.push(proveedorRes);

                    if(listProveedores.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'Proveedores Insertados Correctamente',
                            listProveedoresWithError: listProveedoresWithError
                        });
                    }
                }
            }
            
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
    return new Promise(async (resolve, reject) => {
        try{

            const {idProveedor, idEmpresa, tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                observacion, telefono, celular, email, paginaWeb, direccion, identificacionRepre,
                nombreRepre, telefonoRepre, direccionRepre, emailRepre, nombreBd} = datosProveedor;
            
            let queryExistProveedor = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? AND pro_documento_identidad = ?`;
            let queryUpdateProveedor = `UPDATE ${nombreBd}.proveedores SET pro_tipo_documento_identidad = ?, pro_documento_identidad = ?, 
                                    pro_nombre_natural = ?, pro_razon_social = ?, pro_observacion = ?, pro_telefono = ?, pro_celular = ?, 
                                    pro_email = ?, pro_pagina_web = ?, pro_direccion = ?, pro_cedula_representante = ?, 
                                    pro_nombre_presentante = ?, pro_telefonos_representante = ?, 
                                    pro_direccion_representante = ?, pro_mail_representante = ? WHERE pro_empresa_id = ? AND pro_id = ?`;
            
            let result = await pool.query(queryExistProveedor, [idEmpresa, documentoIdentidad]); 
            

            const cantProveedores = result[0][0].CANT;
            if(cantProveedores == 0){
                reject({
                    isSucess: false,
                    code: 400,
                    message: 'No existe Proveedor',
                    duplicate: true
                });
                return;
            }

            if(cantProveedores == 1){
                    
                    let result = await pool.query(queryUpdateProveedor, [tipoIdentificacion, documentoIdentidad, nombreNatural, razonSocial, 
                        observacion, telefono, celular, email, paginaWeb, direccion, identificacionRepre ? identificacionRepre : '', nombreRepre, telefonoRepre, 
                        direccionRepre, emailRepre, idEmpresa, idProveedor]);
    
                    const insertId = result[0].affectedRows;
                    let insertproveedorResponse = {}
                    if(insertId > 0){
                        insertproveedorResponse['isSucess'] = true;
                    }else{
                        insertproveedorResponse['isSucess'] = false;
                        insertproveedorResponse['message'] = 'error al actualizar proveedor';
                    }
    
                    resolve(insertproveedorResponse);
                    return;
            }else{
                reject({
                    isSucess: false,
                    code: 400,
                    message: 'identificacion ya esta en uso',
                    duplicate: true
                });
                return;
            }
        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.deleteProveedor = async (idEmpresa, idProv, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try {
            let queryDeleteProveedor = `DELETE FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? AND pro_id = ? LIMIT 1`;

            let results = await pool.query(queryDeleteProveedor, [idEmpresa, idProv]);
            const affectedRows = results[0].affectedRows;
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
        }catch(error){
            console.log(error);
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.searchProveedoresByIdEmp = async (idEmpresa, textSearch, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySearchproveedors = `SELECT * FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? AND (pro_nombre_natural LIKE ? || pro_documento_identidad LIKE ?)
                                         ORDER BY pro_id DESC LIMIT 200`
            
            let results = await pool.query(querySearchproveedors, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%']);
            
            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
            });
        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.getTemplateProveedoresExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createTemplateProveedoresExcel(idEmpresa, nombreBd);
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

exports.getListProveedoresExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileProveedores(idEmpresa, nombreBd);
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

function createExcelFileProveedores(idEmp, nombreBd){

    return new Promise(async (resolve, reject) => {
        try{


            let querySelectProveedoresByIdEmp = `SELECT * FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? `;
            let results = await pool.query(querySelectProveedoresByIdEmp, [idEmp]);

                const arrayData = Array.from(results[0]);

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
                    console.log(exception);
            
                    reject({
                        isSucess: false,
                        error: 'error creando archivo, reintente'
                    });
                }

        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}

function createTemplateProveedoresExcel(idEmp, nombreBd){

    return new Promise((resolve, reject) => {
        try{

            const workBook = new excelJS.Workbook(); // Create a new workbook
            const worksheet = workBook.addWorksheet("Lista Proveedores");
            const path = `./files/${idEmp}`;

            worksheet.columns = [
                {header: 'identificacion', key:'identificacion', width: 20},
                {header: 'nombres', key:'nombres',width: 50},
                {header: 'razon_social', key:'razonsocial',width: 20},
                {header: 'direccion', key:'direccion',width: 20},
                {header: 'telefono', key:'telefono',width: 20},
                {header: 'email', key:'email',width: 20},
            ];

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

                const nameFile = `/${Date.now()}_proveedores_template.xlsx`;
        
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
                reject({
                    isSucess: false,
                    error: 'error creando archivo, reintente'
                });
            }

        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo plantilla, reintente'
            });
        }
    });

}

