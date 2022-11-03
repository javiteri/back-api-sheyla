const poolMysql = require('../../connectiondb/mysqlconnection');
const fs = require('fs');
const ftp = require("basic-ftp");

exports.getEmpresaByRuc = function (rucEmpresa, idEmpresa){
    return new Promise((resolve, reject) => {

        try {
            
            queryDatosEmpresa = 'SELECT * FROM empresas WHERE emp_ruc = ? AND emp_id = ? LIMIT 1';

            poolMysql.query(queryDatosEmpresa, [rucEmpresa, idEmpresa], function (err, results, fields) {

                if(err){
                    reject('error obteniendo datos empresa: ' + err);
                    return;
                }

                if(!results | results == undefined | results == null | !results.length){
                    reject('no existe datos empresa');
                    return;
                }

                let arrayData = new Array();
                let datosEmpresaResponse = {
                    isSucess: true
                }
                
                Object.keys(results).forEach(function(key){
                    var row = results[key]
                    arrayData.push({
                        id: row.EMP_ID,
                        ruc: row.EMP_RUC,
                        nombreEmp: row.EMP_NOMBRE,
                        razonSocial: row.EMP_RAZON_SOCIAL,
                        fechaInicio: row.EMP_FECHA_INICIO,
                        slogan: row.EMP_SLOGAN,
                        web: row.EMP_WEB,
                        email: row.EMP_MAIL,
                        telefono: row.EMP_TELEFONOS,
                        direccionMatriz: row.EMP_DIRECCION_MATRIZ,
                        direccionSucursal1: row.EMP_DIRECCION_SUCURSAL1,
                        direccionSucursal2: row.EMP_DIRECCION_SUCURSAL2,
                        direccionSucursal3: row.EMP_DIRECCION_SUCURSAL3,
                        propietario: row.EMP_PROPIETARIO,
                        comentarios: row.EMP_COMENTARIOS
                    })
                });

                datosEmpresaResponse['data'] = arrayData;

                resolve(datosEmpresaResponse);
            });


        }catch(err){
            reject('error obteniendo datos empresa: ' + err) ;
        }

    })
}

exports.updateDatosEmpresa = function (datosEmpresa){

    return new Promise((resolve, reject) => {
        try{

            const {idEmpresa, ruc, nombreEmpresa, razonSocial, fechaInicio, eslogan, 
                web, email, telefonos, direccionMatriz, sucursal1, sucursal2, 
                sucursal3, propietario, comentario, img_base64} = datosEmpresa;
            
            console.log(ruc);
            let base64Image = img_base64.split(';base64,').pop();

            let path = `./files/${idEmpresa}`;
            // save file in dir for send FTP
            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        return console.error(err);
                    }
                    fs.writeFile(`${path}/${ruc}.png`, base64Image,{encoding: 'base64'}, function(error){
                        if(error){
                            console.log('inside error');
                            console.log(error);
                        }

                        sendFilePdfToFtp(`${path}/${ruc}.png`, `${ruc}.png`);

                    });
                });
            }else{
                fs.writeFile(`${path}/${ruc}.png`, base64Image,{encoding: 'base64'}, function(error){
                    if(error){
                        console.log('inside error');
                        console.log(error);
                        return;
                    }

                    sendFilePdfToFtp(`${path}/${ruc}.png`, `${ruc}.png`);

                });
            }

            queryInsertDatosEmpresa = ` UPDATE empresas SET EMP_NOMBRE = ?, EMP_RAZON_SOCIAL = ?, EMP_FECHA_INICIO = ?, EMP_SLOGAN = ?, 
                                            EMP_WEB = ?, EMP_MAIL = ?, EMP_TELEFONOS = ?, EMP_DIRECCION_MATRIZ = ?, EMP_DIRECCION_SUCURSAL1 = ?,
                                            EMP_DIRECCION_SUCURSAL2 = ?, EMP_DIRECCION_SUCURSAL3 = ?, EMP_PROPIETARIO = ?,
                                            EMP_COMENTARIOS = ? WHERE EMP_ID = ? `;

            poolMysql.query(queryInsertDatosEmpresa, [
                                nombreEmpresa, razonSocial, fechaInicio, 
                                eslogan, web, email, telefonos, direccionMatriz, sucursal1, sucursal2,
                                sucursal3, propietario, comentario, idEmpresa
                            ], function(err, results, fields) {
                                

                                if(err){
                                    reject('error actualizando datos empresa: ' + err);
                                    return;
                                }

                                const affectedRows = results.affectedRows;
                                let updateDatosEmpresaResponse = {}
                                if(affectedRows === 0){
                                    updateDatosEmpresaResponse['isSucess'] = false;
                                    updateDatosEmpresaResponse['message'] = 'error al actualizar datos empresa';
                                }else{
                                    updateDatosEmpresaResponse['isSucess'] = true;
                                }

                                resolve(updateDatosEmpresaResponse);

                            });

        }catch(error){
            reject('error actualizando datos empresa: ' + error) ; 
        }
    });
}

async function sendFilePdfToFtp(pathFile, nombrePdf){
    const client = new ftp.Client()

    try {
        await client.access({
            host: "sheyla2.dyndns.info",
            user: "firmas",
            password: "m10101418M"
        })
        const response = await client.uploadFrom(pathFile,`logos/${nombrePdf}` );
    }catch(exception){
        console.log(err)
    }

    client.close()

}


exports.getImagenLogoByRucEmp = function(rucEmp){
    return new Promise( async (resolve, reject) => {
      
        //CONNECT TO FTP SERVER
        const client = new ftp.Client()

        try {
            await  client.access({
                host: "sheyla2.dyndns.info",
                user: "firmas",
                password: "m10101418M"
            })

            let pathRemoteFile = `logos/${rucEmp}.png`
            let path = `./filesTMP/${rucEmp}`;

            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, async (err) => {
                    if (err) {
                        return console.error(err);
                    }

                    try{
                        
                        const response = await client.downloadTo(`${path}/${rucEmp}.png`,pathRemoteFile);
                        client.close();
                        console.log('inside');
                        resolve({
                            isSucess: true,
                            message: 'imagen descargada',
                            path: `${path}/${rucEmp}.png`
                        });

                    }catch(error){
                        console.log('error obteniendo archivo imagen ftp');
                        client.close();
                        console.log(error);
                        reject({
                            isSucess: false,
                            message: 'ocurrio un error obteniendo logo'
                        });
                    }
                });
            }else{

                try{
                    const response = await client.downloadTo(`${path}/${rucEmp}.png`,pathRemoteFile);
                    client.close();
                    resolve({
                        isSucess: true,
                        message: 'imagen descargada',
                        path: `${path}/${rucEmp}.png`
                    });
                }catch(error){
                    console.log('error obteniendo archivo imagen ftp');
                    client.close();
                    reject({
                        isSucess: false,
                        message: 'ocurrio un error obteniendo logo'
                    });
                }
            }

        }catch(exception){
            client.close();
            reject({
                isSucess: false,
                message: 'ocurrio un error obteniendo logo'
            });

        }

    });
}


