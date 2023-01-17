const poolMysql = require('../../../connectiondb/mysqlconnection');
const fs = require('fs');
const ftp = require("basic-ftp");

exports.guardarDatosEstablecimiento = async function (datosEstablecimiento){

    return new Promise(async (resolve, reject) => {
        try{

            const {idEmpresa, ruc, establecimiento, nombreEmpresa, direccion, telefono, 
                    img_base64, extensionFile, nombreBd} = datosEstablecimiento;

            //IF EXIST, SEND IMAGE LOGO TO FTP 
            if(img_base64){
                let base64Image = img_base64.split(';base64,').pop();

                let path = `./files/${idEmpresa}`;
                // save file in dir for send FTP
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        // Si existe un error, comprueba si se debe a que el directorio ya existe
                        if(!err.code === 'EEXIST'){ 
                            reject('error al crear directorio: ' + err);
                            return;
                        }
                    }

                    fs.writeFile(`${path}/${ruc}.${extensionFile}`, base64Image,{encoding: 'base64'}, function(error){
                        if(error){
                            console.log(error);
                            reject('error al escribir imagen establecimiento: ' + error);
                            return;
                        }

                        sendFileLogoToFtp(`${path}/${ruc}.${extensionFile}`, `${ruc}.${extensionFile}`);

                    });
                });
            }

            queryInsertDatosEstablecimiento = ` INSERT INTO ${nombreBd}.config_establecimientos (cone_empresa_id, cone_establecimiento, cone_nombre_establecimiento, 
                                                cone_direccion_sucursal, cone_telefonos_sucursal) VALUES (?, ?, ?, ?,?);`;

            let results = await poolMysql.query(queryInsertDatosEstablecimiento, [idEmpresa, establecimiento, nombreEmpresa, 
                                                            direccion, telefono]); 

            const affectedRows = results[0].affectedRows;
            let updateDatosEmpresaResponse = {}
            if(affectedRows === 0){
                updateDatosEmpresaResponse['isSucess'] = false;
                updateDatosEmpresaResponse['message'] = 'error al insertar datos establecimiento';
            }else{
                updateDatosEmpresaResponse['isSucess'] = true;
            }

            resolve(updateDatosEmpresaResponse);

        }catch(error){
            reject('error insertando datos establecimiento: ' + error);
        }
    });
}


exports.actualizarDatosEstablecimiento = async function (datosEstablecimiento){

    return new Promise(async (resolve, reject) => {
        try{

            const {idEstablecimiento, idEmpresa, ruc, establecimiento, nombreEmpresa, direccion, telefono, 
                    img_base64, extensionFile, nombreBd} = datosEstablecimiento;

            //IF EXIST, SEND IMAGE LOGO TO FTP 
            if(img_base64){
                let base64Image = img_base64.split(';base64,').pop();

                let path = `./files/${idEmpresa}`;
                // save file in dir for send FTP
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        // Si existe un error, comprueba si se debe a que el directorio ya existe
                        if(!err.code === 'EEXIST'){ 
                            reject('error al crear directorio: ' + err);
                            return;
                        }
                    }
                    
                    fs.writeFile(`${path}/${ruc}.${extensionFile}`, base64Image,{encoding: 'base64'}, function(error){
                        if(error){
                            console.log(error);
                            reject('error al escribir imagen establecimiento: ' + error);
                            return;
                        }

                        sendFileLogoToFtp(`${path}/${ruc}.${extensionFile}`, `${ruc}.${extensionFile}`);

                    });
                });
            }

            queryUpdateDatosEstablecimiento = ` UPDATE ${nombreBd}.config_establecimientos SET cone_establecimiento = ?, cone_nombre_establecimiento = ?, 
                                                cone_direccion_sucursal = ?, cone_telefonos_sucursal = ? WHERE cone_id = ? AND cone_empresa_id = ?`;

            let results = await poolMysql.query(queryUpdateDatosEstablecimiento, [establecimiento, nombreEmpresa, 
                                                            direccion, telefono, idEstablecimiento, idEmpresa]);

            const affectedRows = results[0].affectedRows;
            let updateDatosEmpresaResponse = {}
            if(affectedRows === 0){
                    updateDatosEmpresaResponse['isSucess'] = false;
                    updateDatosEmpresaResponse['message'] = 'error al actualizar datos establecimiento';
            }else{
                    updateDatosEmpresaResponse['isSucess'] = true;
            }

            resolve(updateDatosEmpresaResponse);

        }catch(error){
            reject('error actualizando datos establecimiento: ' + error);
        }
    });
}

exports.getEstablecimientosByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectEstablecimientos = `SELECT cone_id as id, cone_empresa_id, cone_establecimiento as numeroEstablecimiento, 
            cone_nombre_establecimiento as nombreEmpresa, cone_direccion_sucursal as direccion, cone_telefonos_sucursal as telefono 
            FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ?`
            
            let results = await poolMysql.query(querySelectEstablecimientos, [idEmpresa]); 
                
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
                resolve({
                    isSucess: true,
                    code: 400,
                    message: 'no se encontro establecimientos'
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


exports.getEstablecimientoByIdEmp = async (idEmpresa, idEstablecimiento,nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_id = ? LIMIT 1`
            
            let results = await poolMysql.query(querySelectEstablecimiento, [idEmpresa, idEstablecimiento]); 
                
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
                resolve({
                    isSucess: true,
                    code: 400,
                    message: 'no se encontro establecimiento'
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

exports.getEstablecimientosByIdEmpNumEstab = async (idEmpresa, numeroEstablecimiento,nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_establecimiento = ? LIMIT 1`
            
            let results = await poolMysql.query(querySelectEstablecimiento, [idEmpresa, numeroEstablecimiento]); 
                
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
                resolve({
                    isSucess: true,
                    code: 400,
                    message: 'no se encontro establecimiento'
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

exports.deleteEstablecimiento = async (idEmpresa, idEstablecimiento, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try {
            let queryDeleteEstablecimiento = `DELETE FROM ${nombreBd}.config_establecimientos WHERE cone_id = ? AND cone_empresa_id = ? LIMIT 1`;

            let results = await poolMysql.query(queryDeleteEstablecimiento, [idEstablecimiento, idEmpresa]); 

            const affectedRows = results[0].affectedRows;
            if(affectedRows === 1){

                const deleteEstablecimientoResponse = {
                    'isSucess': true
                }
    
                resolve(deleteEstablecimientoResponse);
            }else{
                reject({
                    isSucess: false,
                    code: 400,
                    message: 'error al eliminar el establecimiento, reintente',
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



// -------------------------- METHODS --------------------------------------------
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
        console.log(err)
    }

    client.close()
    deleteImageFileByPath(pathFile);

}


function deleteImageFileByPath(pathImageLogo){
    fs.unlink(pathImageLogo, function(){
    });
}
