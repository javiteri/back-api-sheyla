const pool = require('../../../connectiondb/mysqlconnection')
const excelJS = require("exceljs");
const fs = require('fs');
const httpClient = require('http');

exports.getDatosClienteByRucPhp = async(ruc) => {
    return new Promise(async (resolve, reject) => {
        
        try{
             // HACER UN REQUEST A http://sheyla2.dyndns.info/sheylaweb/VALIDAR_EMPRESA.php?SERIE=1718792656001
             //https://sheyla.net/SRI/SRI.php
             let options = {
                host: 'sheyla.net',
                path: `/SRI/SRI.php?ruc=${ruc}&actualizado=Y`
            };

            const callback = function(response){
                let str = '';

                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function () {
                    resolve({
                        isSucess: true,
                        data: str.trim()
                    });
                });
            }

            httpClient.request(options, callback).end();

        }catch(error){
            reject(error);
        }
    }); 
}

exports.getListClientes = async (limit) => {
    return new Promise(async (resolve, reject) => {
        
        try{
                
            let listClientes = await pool.query(`SELECT * FROM clientes ORDER BY cli_id DESC LIMIT ${limit}`);    
            resolve(listClientes[0]);
        }catch(e){
            resolve('error: ' + e)
        }
    });    

}

exports.insertCliente = async (datosCliente) => {
    return new Promise(async (resolve, reject ) => {
        try{

            const {idEmpresa, nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, 
                    razonSocial, comentario, fechaNacimiento, telefonos,
                    celular, email, direccion, profesion, nombreBd} = datosCliente;
            
            let queryExistClient = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ?`;
            let queryInsertUserDefaultEmpresa = `INSERT INTO ${nombreBd}.clientes (cli_empresa_id, cli_nacionalidad, cli_documento_identidad, cli_tipo_documento_identidad, 
                                                cli_nombres_natural, cli_razon_social , cli_observacion , cli_fecha_nacimiento , 
                                                cli_teleono, cli_celular, cli_email, cli_direccion, cli_profesion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            
            let result = await pool.query(queryExistClient, [idEmpresa, documentoIdentidad]);
            
            const cantClients = result[0][0].CANT;
            if(cantClients >= 1){  
                reject({
                    isSucess: false,
                    code: 400,
                    messageError: 'ya existe el cliente',
                    duplicate: true
                });
                return;
            }
            let results = await pool.query(queryInsertUserDefaultEmpresa, [idEmpresa, nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, razonSocial ? razonSocial : '', 
                                        comentario ? comentario : '', fechaNacimiento, telefonos ? telefonos : '', celular ? celular : '', email ? email : '', 
                                        direccion ? direccion : '', profesion ? profesion : '']);
            
            let insertId = results[0].insertId;
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

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.importListClientes = async (listClientes, nombreBd, idEmpresa) => {
    return new Promise((resolve, reject ) => {
        try{
            let listClientsWithError = [];

            const selectExistClient = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ?`;
            const queryInsertUserDefaultEmpresa = `INSERT INTO ${nombreBd}.clientes (cli_empresa_id, cli_nacionalidad, cli_documento_identidad, cli_tipo_documento_identidad, 
                cli_nombres_natural, cli_razon_social , cli_observacion , cli_fecha_nacimiento , 
                cli_teleono, cli_celular, cli_email, cli_direccion, cli_profesion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                
            listClientes.forEach(async (cliente, index) => {
                try{
                    let existClientResult = await pool.query(selectExistClient, [cliente.cli_documento_identidad, cliente.cli_empresa_id]);
                    
                    const cantClients = existClientResult[0][0].CANT;
                    if(cantClients >= 1){
                        let clienteRes = cliente;
                        clienteRes.messageError = 'ya existe el cliente';
                        clienteRes.cli_error_server = true;
                        listClientsWithError.push(clienteRes);
                    }else{
                        await pool.query(queryInsertUserDefaultEmpresa, [
                            idEmpresa, 'Ecuador', cliente.cli_documento_identidad, cliente.cli_tipo_documento_identidad, cliente.cli_nombres_natural,
                            cliente.cli_razon_social, cliente.cli_observacion, cliente.cli_fecha_nacimiento, cliente.cli_teleono, cliente.cli_celular,
                            cliente.cli_email, cliente.cli_direccion, cliente.cli_profesion
                        ]);
                    }

                    if(listClientes.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'Clientes Insertados Correctamente',
                            listClientesWithError: listClientsWithError
                        });
                    }

                }catch(exception){

                    let clienteRes = cliente;
                    clienteRes.messageError = 'error al insertar cliente';
                    clienteRes.cli_error_server = true;
                    listClientsWithError.push(clienteRes);

                    if(listClientes.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'Clientes Insertados Correctamente',
                            listClientesWithError: listClientsWithError
                        });
                    }
                }

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


exports.getListClientesByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectClientes = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? ORDER BY cli_id DESC LIMIT 200`
            
            let results = await pool.query(querySelectClientes, [idEmpresa]); 
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

exports.getClienteByIdEmp = async (idCliente, idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectClientes = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_id = ? LIMIT 1`
            
            let results = await pool.query(querySelectClientes, [idEmpresa, idCliente]);

            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
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
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.updateCliente = async (datosClienteUpdate) => {
    return new Promise(async (resolve, reject) => {
        try{

            const {idCliente, idEmpresa, nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, 
                    razonSocial, comentario, fechaNacimiento, telefonos,
                    celular, email, direccion, profesion, nombreBd} = datosClienteUpdate;
            
            let queryExistClient = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ?`;
            let queryUpdateClienteDefaultEmpresa = `UPDATE ${nombreBd}.clientes SET cli_nacionalidad = ?, cli_documento_identidad = ?,
                                                 cli_tipo_documento_identidad = ?, cli_nombres_natural = ?, cli_razon_social = ? , cli_observacion = ? ,
                                                 cli_fecha_nacimiento = ?, cli_teleono = ?, cli_celular = ?, cli_email = ?, cli_direccion = ?, cli_profesion = ?
                                                 WHERE cli_empresa_id = ? AND cli_id = ?`;
            
            let result = await pool.query(queryExistClient, [idEmpresa, documentoIdentidad]);

            const cantClients = result[0][0].CANT;
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
                    
                    let result = await pool.query(queryUpdateClienteDefaultEmpresa, [nacionalidad, documentoIdentidad, tipoIdentificacion, nombreNatural, razonSocial, comentario,
                                                    fechaNacimiento, telefonos, celular, email, direccion, profesion, idEmpresa, idCliente]);

                    let insertId = result[0].affectedRows;
                    let insertClienteResponse = {}
                    if(insertId > 0){
                        insertClienteResponse['isSucess'] = true;
                    }else{
                        insertClienteResponse['isSucess'] = false;
                        insertClienteResponse['message'] = 'error al actualizar cliente';
                    }

                    resolve(insertClienteResponse);
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

exports.deleteCliente = async (idEmpresa, idCliente, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try {
            let queryDeleteCliente = `DELETE FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_id = ? LIMIT 1`;
           
            let results = await pool.query(queryDeleteCliente, [idEmpresa, idCliente]);
            const affectedRows = results[0].affectedRows;
            
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
        }catch(error){
            
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.searchClientesByIdEmp = async (idEmpresa, textSearch, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySearchClientes = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND (cli_nombres_natural LIKE ? || cli_documento_identidad LIKE ?)
                                         ORDER BY cli_id DESC LIMIT 200`
            
            let results = await pool.query(querySearchClientes, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%']);
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

exports.getTemplateClientesExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createTemplateClientesExcel(idEmpresa, nombreBd);
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

exports.getListClientesExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileClientes(idEmpresa, nombreBd);
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

function createExcelFileClientes(idEmp, nombreBd){

    return new Promise(async (resolve, reject) => {
        try{


            let querySelectClientes = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? ORDER BY cli_id DESC `
            
            let results = await pool.query(querySelectClientes, [idEmp]);
           
                  
                const arrayData = Array.from(results[0]);

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

        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}


function createTemplateClientesExcel(idEmp, nombreBd){

    return new Promise((resolve, reject) => {
        try{

            const workBook = new excelJS.Workbook(); // Create a new workbook
            const worksheet = workBook.addWorksheet("Lista Clientes");
            const path = `./files/${idEmp}`;

            worksheet.columns = [
                {header: 'identificacion', key:'identificacion', width: 20},
                {header: 'nombres', key:'nombres',width: 50},
                {header: 'razonsocial', key:'razonsocial',width: 20},
                {header: 'observacion', key:'observacion',width: 20},
                {header: 'fechanacimiento', key:'fechanacimiento',width: 40},
                {header: 'telefono', key:'telefono',width: 20},
                {header: 'celular', key:'celular',width: 20},
                {header: 'email', key:'email',width: 20},
                {header: 'direccion', key:'direccion',width: 20}
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

                const nameFile = `/${Date.now()}_clientes_template.xlsx`;
        
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

        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo plantilla, reintente'
            });
        }
    });

}

