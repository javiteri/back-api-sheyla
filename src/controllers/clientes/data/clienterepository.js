const pool = require('../../../connectiondb/mysqlconnection')
const excelJS = require("exceljs");
const fs = require('fs');

exports.getListClientes = async (limit) => {
    

    return new Promise((resolve, reject) => {
        
        try{
                
            listClientes = pool.query(`SELECT * FROM clientes ORDER BY cli_id DESC LIMIT ${limit}`);    
            resolve(listClientes)
        }catch(e){
            resolve('error: ' + e)
        }
    });    

}

exports.insertCliente = async (datosCliente) => {
    return new Promise((resolve, reject ) => {
        try{

            const {idEmpresa, nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, 
                    razonSocial, comentario, fechaNacimiento, telefonos,
                    celular, email, direccion, profesion} = datosCliente;
            
            let queryExistClient = "SELECT COUNT(*) AS CANT FROM clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ?";
            let queryInsertUserDefaultEmpresa = `INSERT INTO clientes (cli_empresa_id, cli_nacionalidad, cli_documento_identidad, cli_tipo_documento_identidad, 
                                                cli_nombres_natural, cli_razon_social , cli_observacion , cli_fecha_nacimiento , 
                                                cli_teleono, cli_celular, cli_email, cli_direccion, cli_profesion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            
            pool.query(queryExistClient, [idEmpresa, documentoIdentidad], function(error, result, fields){
                if(error){
                    
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: error
                    });
                    return;
                }

                const cantClients = result[0].CANT;
                if(cantClients >= 1){
                    
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ya existe el cliente',
                        duplicate: true
                    });
                    return;
                }
                pool.query(queryInsertUserDefaultEmpresa, [idEmpresa, nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, razonSocial ? razonSocial : '', 
                                        comentario ? comentario : '', fechaNacimiento, telefonos ? telefonos : '', celular ? celular : '', email ? email : '', 
                                        direccion ? direccion : '', profesion ? profesion : ''], 
                    function (error, result){

                        if(error){
                            console.log(error);
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
                            insertClienteResponse['message'] = 'error al insertar cliente';
                        }
                        insertClienteResponse['data'] = {
                            id: insertId,
                            ciRuc: documentoIdentidad,
                            nombre: nombreNatural,
                            email: email ? email : ''
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

exports.getListClientesByIdEmp = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectClientes = `SELECT * FROM clientes WHERE cli_empresa_id = ? ORDER BY cli_id DESC `
            
            pool.query(querySelectClientes, [idEmpresa], (err, results) => {

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

exports.getClienteByIdEmp = async (idCliente, idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectClientes = `SELECT * FROM clientes WHERE cli_empresa_id = ? AND cli_id = ? LIMIT 1`
            
            pool.query(querySelectClientes, [idEmpresa, idCliente], (err, results) => {

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
                        message: 'no se encontro cliente'
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

exports.updateCliente = async (datosClienteUpdate) => {
    return new Promise((resolve, reject) => {
        try{

            const {idCliente, idEmpresa, nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, 
                    razonSocial, comentario, fechaNacimiento, telefonos,
                    celular, email, direccion, profesion} = datosClienteUpdate;
            
            let queryExistClient = "SELECT COUNT(*) AS CANT FROM clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ?";
            let queryUpdateClienteDefaultEmpresa = `UPDATE clientes SET cli_nacionalidad = ?, cli_documento_identidad = ?,
                                                 cli_tipo_documento_identidad = ?, cli_nombres_natural = ?, cli_razon_social = ? , cli_observacion = ? ,
                                                 cli_fecha_nacimiento = ?, cli_teleono = ?, cli_celular = ?, cli_email = ?, cli_direccion = ?, cli_profesion = ?
                                                 WHERE cli_empresa_id = ? AND cli_id = ?`;
            
            pool.query(queryExistClient, [idEmpresa, documentoIdentidad], function(error, result, fields){
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
                        message: 'no existe el cliente',
                        duplicate: true
                    });
                    return;
                }

                if(cantClients == 1){
                    
                    pool.query(queryUpdateClienteDefaultEmpresa, [nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, razonSocial, comentario,
                        fechaNacimiento, telefonos, celular, email, direccion, profesion, idEmpresa, idCliente], 
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
                                insertClienteResponse['message'] = 'error al actualizar cliente';
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

exports.deleteCliente = async (idEmpresa, idCliente) => {
    return new Promise((resolve, reject) => {
        try {
            let queryDeleteCliente = 'DELETE FROM clientes WHERE cli_empresa_id = ? AND cli_id = ? LIMIT 1';

            pool.query(queryDeleteCliente, [idEmpresa, idCliente], function(error, results, fields){
                if(error){
                    console.log(error);
                    reject({
                        isSucess: false,
                        code: 400,
                        tieneMovimientos: error.message.includes('a foreign key constraint fails') ? true : false
                    });
                    return;
                }

                const affectedRows = results.affectedRows;
                if(affectedRows === 1){

                    const deleteClienteResponse = {
                        'isSucess': true
                    }
    
                    resolve(deleteClienteResponse);
                    return;

                }else{
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'error al eliminar el cliente, reintente',
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

exports.searchClientesByIdEmp = async (idEmpresa, textSearch) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySearchClientes = `SELECT * FROM clientes WHERE cli_empresa_id = ? AND (cli_nombres_natural LIKE ? || cli_documento_identidad LIKE ?)
                                         ORDER BY cli_id DESC`
            
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

exports.getListClientesExcel = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileClientes(idEmpresa);
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

function createExcelFileClientes(idEmp){

    return new Promise((resolve, reject) => {
        try{


            let querySelectClientes = `SELECT * FROM clientes WHERE cli_empresa_id = ? ORDER BY cli_id DESC `
            
            pool.query(querySelectClientes, [idEmp], (err, results) => {
                
                if(err){
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
                const worksheet = workBook.addWorksheet("Lista Clientes");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Identificacion', key:'identificacion', width: 20},
                    {header: 'Nombre', key:'nombre',width: 50},
                    {header: 'Telefono', key:'telefono',width: 20},
                    {header: 'Celular', key:'celular',width: 20},
                    {header: 'Email', key:'email',width: 40},
                    {header: 'Nacionalidad', key:'nacionalidad',width: 20}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        identificacion: valor.cli_documento_identidad,
                        nombre: valor.cli_nombres_natural,
                        telefono: valor.cli_teleono,
                        celular: valor.cli_celular,
                        email: valor.cli_email,
                        nacionalidad: valor.cli_nacionalidad
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

                    const nameFile = `/${Date.now()}_clientes.xlsx`;
            
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


