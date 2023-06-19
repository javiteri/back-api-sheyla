const poolMysql = require('../../connectiondb/mysqlconnection');
const fs = require('fs');
const ftp = require("basic-ftp");

exports.getEmpresaByRuc = function (rucEmpresa, idEmpresa, nombreBd){
    return new Promise(async (resolve, reject) => {

        try {
            
            queryDatosEmpresa = `SELECT * FROM ${nombreBd}.empresas WHERE emp_ruc = ? AND emp_id = ? LIMIT 1`;

            let results = await poolMysql.query(queryDatosEmpresa, [rucEmpresa, idEmpresa]);

            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
                reject('no existe datos empresa');
                return;
            }

            let arrayData = new Array();
            let datosEmpresaResponse = {
                isSucess: true
            }
            
            for(let index = 0; index < results[0].length; index++){
                let row = results[0][index];

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
                });
            }
            
            datosEmpresaResponse['data'] = arrayData;

            resolve(datosEmpresaResponse);

        }catch(err){
            reject('error obteniendo datos empresa: ' + err) ;
        }

    })
}

exports.updateDatosEmpresa = async function (datosEmpresa){

    return new Promise(async (resolve, reject) => {
        try{

            const {idEmpresa, ruc, nombreEmpresa, razonSocial, fechaInicio, eslogan, 
                web, email, telefonos, direccionMatriz, sucursal1, sucursal2, 
                sucursal3, propietario, comentario, img_base64, extensionFile, nombreBd} = datosEmpresa;

            //IF EXIST, SEND IMAGE LOGO TO FTP 
            if(img_base64){
                let base64Image = img_base64.split(';base64,').pop();

                let path = `./files/${idEmpresa}`;
                // save file in dir for send FTP
                if(!fs.existsSync(`${path}`)){
                    fs.mkdir(`${path}`,{recursive: true}, (err) => {
                        if (err) {
                            return console.error(err);
                        }
                        fs.writeFile(`${path}/${ruc}.${extensionFile}`, base64Image,{encoding: 'base64'}, function(error){
                            if(error){
                                console.log('inside error');
                                console.log(error);
                                return;
                            }

                            sendFileLogoToFtp(`${path}/${ruc}.${extensionFile}`, `${ruc}.${extensionFile}`);

                        });
                    });
                }else{
                    fs.writeFile(`${path}/${ruc}.${extensionFile}`, base64Image,{encoding: 'base64'}, function(error){
                        if(error){
                            console.log('inside error');
                            console.log(error);
                            return;
                        }

                        sendFileLogoToFtp(`${path}/${ruc}.${extensionFile}`, `${ruc}.${extensionFile}`);

                    });
                }
            }

            queryInsertDatosEmpresa = `UPDATE ${nombreBd}.empresas SET EMP_NOMBRE = ?, EMP_RAZON_SOCIAL = ?, EMP_FECHA_INICIO = ?, EMP_SLOGAN = ?, 
                                            EMP_WEB = ?, EMP_MAIL = ?, EMP_TELEFONOS = ?, EMP_DIRECCION_MATRIZ = ?, EMP_DIRECCION_SUCURSAL1 = ?,
                                            EMP_DIRECCION_SUCURSAL2 = ?, EMP_DIRECCION_SUCURSAL3 = ?, EMP_PROPIETARIO = ?,
                                            EMP_COMENTARIOS = ? WHERE EMP_ID = ? `;

            let results = await poolMysql.query(queryInsertDatosEmpresa, [
                                nombreEmpresa, razonSocial, fechaInicio, 
                                eslogan, web, email, telefonos, direccionMatriz, sucursal1, sucursal2,
                                sucursal3, propietario, comentario, idEmpresa
                            ]);

            const affectedRows = results[0].affectedRows;
            let updateDatosEmpresaResponse = {}
            if(affectedRows === 0){
                updateDatosEmpresaResponse['isSucess'] = false;
                updateDatosEmpresaResponse['message'] = 'error al actualizar datos empresa';
            }else{
                updateDatosEmpresaResponse['isSucess'] = true;
            }

            resolve(updateDatosEmpresaResponse);

        }catch(error){
            reject('error actualizando datos empresa: ' + error) ; 
        }
    });
}

async function sendFileLogoToFtp(pathFile, nombrePdf){
    const client = new ftp.Client()

    try {
        await client.access({
            host: "sheyla2.dyndns.info",
            user: "firmas",
            password: "m10101418M"
        })
        const response = await client.uploadFrom(pathFile,`logos/${nombrePdf}` );
    }catch(exception){
        console.log(exception)
    }

    client.close()
    deleteImageFileByPath(pathFile);

}

function deleteImageFileByPath(pathImageLogo){
    fs.unlink(pathImageLogo, function(){
    });
}

exports.getImagenLogoByRucEmp = function(rucEmp){
    return new Promise( async (resolve, reject) => {

        try {
            let pathRemoteFile = `logos/${rucEmp}.png`;
            let path = `./filesTMP/${rucEmp}`;

            fs.mkdir(`${path}`,{recursive: true}, async (err) => {
                if (err) {
                     // Si existe un error, comprueba si se debe a que el directorio ya existe
                     if(err.code !== 'EEXIST'){ 
                        reject('error al crear directorio: ' + err);
                        return;
                    }
                }

                try{
                    const extensionFile = await downloadImagenFileFromFtp(pathRemoteFile, `${path}/${rucEmp}`);

                    resolve({
                        isSucess: true,
                        message: 'imagen descargada',
                        path: `${path}/${rucEmp}.${extensionFile}`
                    });

                }catch(error){
                    reject({
                        isSucess: false,
                        message: 'ocurrio un error obteniendo logo'
                    });
                }
            });

        }catch(exception){
            reject({
                isSucess: false,
                message: 'ocurrio un error obteniendo logo'
            });
        }

    });
}

async function downloadImagenFileFromFtp(pathRemoteFile, pathDestFile){
    //CONNECT TO FTP SERVER
    const client = new ftp.Client();
    try{

        await  client.access({
            host: "sheyla2.dyndns.info",
            user: "firmas",
            password: "m10101418M"
        });
    
        const fileNameWithoutExt = pathRemoteFile.split('.')[0].split('/')[1];
        const listFilesInDir = await client.list('logos');
        let extensionRemoteFile = '.png';
    
        listFilesInDir.forEach(function(file){
            if(file.name.split('.')[0] === fileNameWithoutExt){
                extensionRemoteFile = file.name.split('.').pop();
                return;
            }
        });
        
        await client.downloadTo(`${pathDestFile}.${extensionRemoteFile}`, `${pathRemoteFile.split('.')[0]}.${extensionRemoteFile}`);
    
        client.close();
        return extensionRemoteFile;
        
    }catch(ex){
        client.close();
        throw new Error(ex);
    }

}



