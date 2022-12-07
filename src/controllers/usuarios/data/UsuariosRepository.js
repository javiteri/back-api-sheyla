const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");

const fs = require('fs');

exports.getUsuarioByIdEmp = async (idUser, idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectClientes = `SELECT * FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? AND usu_id = ? LIMIT 1`
            
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

exports.getListUsuariosByIdEmp = async (idEmpresa, nombreBd) => {

    return new Promise((resolve, reject) => {
        try {
            
            let querySelectUsuariosByIdEmp = `SELECT * FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? `;
            pool.query(querySelectUsuariosByIdEmp, [idEmpresa], function (error, results, fields){

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: error
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
                    email, fechaNacimiento, nombreUsuario, password, permisoEscritura, nombreBd} = datosCliente;

            let queryExistUsuario = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? AND usu_identificacion = ?`;
            let queryInsertUser = `INSERT INTO ${nombreBd}.usuarios (usu_empresa_id, usu_nombres, usu_identificacion, usu_telefonos, usu_direccion, usu_mail,
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
                email, fechaNacimiento, nombreUsuario, password, permisoEscritura, nombreBd} = datosUsuarioUpdate;
            
            let queryExistUser = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? AND usu_id = ?`;
            let queryUpdateUsuario = `UPDATE ${nombreBd}.usuarios SET usu_identificacion = ?, usu_empresa_id = ?, usu_nombres = ?,
                                                 usu_telefonos = ?, usu_direccion = ?, usu_mail = ? , usu_fecha_nacimiento = ? ,
                                                 usu_username = ?, usu_password = ?, usu_permiso_escritura = ? WHERE usu_empresa_id = ? AND usu_id = ?`;
            
                                                 console.log(queryUpdateUsuario);
            pool.query(queryExistUser, [idEmpresa, idUsuario], function(error, result, fields){
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
                    
                    pool.query(queryUpdateUsuario, [identificacion,idEmpresa, nombreNatural, telefono, direccion, email, fechaNacimiento,
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

exports.deleteUsuario = async (idEmpresa, idUser,nombreBd) => {
    return new Promise((resolve, reject) => {
        try {
            let queryDeleteUsuario = `DELETE FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? AND usu_id = ? LIMIT 1`;

            pool.query(queryDeleteUsuario, [idEmpresa, idUser], function(error, results, fields){
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

exports.searchUsuariosByIdEmp = async (idEmpresa, textSearch,nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySearchUsuarios = `SELECT * FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? AND (usu_nombres LIKE ? || usu_identificacion LIKE ?)
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

exports.getListUsersExcel = async (idEmpresa,nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileUsuarios(idEmpresa,nombreBd);
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

function createExcelFileUsuarios(idEmp,nombreBd){

    return new Promise((resolve, reject) => {
        try{

            let querySelectUsuariosByIdEmp = `SELECT * FROM ${nombreBd}.usuarios WHERE usu_empresa_id = ? `;
            pool.query(querySelectUsuariosByIdEmp, [idEmp], function (error, results){

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: err
                    });
                    return;
                }

            
                const arrayData = Array.from(results);

                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Lista Usuarios");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'identificacion', key:'identificacion', width: 20},
                    {header: 'nombre', key:'nombre',width: 50},
                    {header: 'telefono', key:'telefono',width: 20},
                    {header: 'email', key:'email',width: 40},
                    {header: 'username', key:'username',width: 20}
                ];
            

                arrayData.forEach(valor => {
                    let valorInsert = {
                        identificacion: valor.usu_identificacion,
                        nombre: valor.usu_nombres,
                        telefono: valor.usu_telefonos,
                        email: valor.usu_mail,
                        username: valor.usu_username
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

                    const nameFile = `/${Date.now()}_users.xlsx`;
            
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