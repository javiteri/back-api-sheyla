const poolMysql = require('../../../connectiondb/mysqlconnection');
const fs = require('fs');
const ftp = require("basic-ftp");

exports.guardarDatosEstablecimiento = async function (datosEstablecimiento){

    return new Promise((resolve, reject) => {
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
                /*if(!fs.existsSync(`${path}`)){
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
                }else{
                    fs.writeFile(`${path}/${ruc}.${extensionFile}`, base64Image,{encoding: 'base64'}, function(error){
                        if(error){
                            console.log(error);
                            reject('error al escribir imagen establecimiento: ' + error);
                            return;
                        }

                        sendFileLogoToFtp(`${path}/${ruc}.${extensionFile}`, `${ruc}.${extensionFile}`);

                    });
                }*/
            }

            queryInsertDatosEstablecimiento = ` INSERT INTO ${nombreBd}.config_establecimientos (cone_empresa_id, cone_establecimiento, cone_nombre_establecimiento, 
                                                cone_direccion_sucursal, cone_telefonos_sucursal) VALUES (?, ?, ?, ?,?);`;

            poolMysql.query(queryInsertDatosEstablecimiento, [idEmpresa, establecimiento, nombreEmpresa, 
                                                            direccion, telefono], function(err, results, fields) {
                                
                if(err){
                    reject('error insertando datos establecimiento: ' + err);
                    return; 
                }

                const affectedRows = results.affectedRows;
                let updateDatosEmpresaResponse = {}
                if(affectedRows === 0){
                    updateDatosEmpresaResponse['isSucess'] = false;
                    updateDatosEmpresaResponse['message'] = 'error al insertar datos establecimiento';
                }else{
                    updateDatosEmpresaResponse['isSucess'] = true;
                }

                resolve(updateDatosEmpresaResponse);

            });

        }catch(error){
            reject('error insertando datos establecimiento: ' + error);
        }
    });
}


exports.actualizarDatosEstablecimiento = async function (datosEstablecimiento){

    return new Promise((resolve, reject) => {
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

            poolMysql.query(queryUpdateDatosEstablecimiento, [establecimiento, nombreEmpresa, 
                                                            direccion, telefono, idEstablecimiento, idEmpresa], function(err, results, fields) {
                                
                if(err){
                    reject('error insertando datos establecimiento: ' + err);
                    return; 
                }

                const affectedRows = results.affectedRows;
                let updateDatosEmpresaResponse = {}
                if(affectedRows === 0){
                    updateDatosEmpresaResponse['isSucess'] = false;
                    updateDatosEmpresaResponse['message'] = 'error al actualizar datos establecimiento';
                }else{
                    updateDatosEmpresaResponse['isSucess'] = true;
                }

                resolve(updateDatosEmpresaResponse);

            });

        }catch(error){
            reject('error actualizando datos establecimiento: ' + error);
        }
    });
}

exports.getEstablecimientosByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectEstablecimientos = `SELECT cone_id as id, cone_empresa_id, cone_establecimiento as numeroEstablecimiento, 
            cone_nombre_establecimiento as nombreEmpresa, cone_direccion_sucursal as direccion, cone_telefonos_sucursal as telefono 
            FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ?`
            
            poolMysql.query(querySelectEstablecimientos, [idEmpresa], (err, results) => {

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
                        message: 'no se encontro establecimientos'
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

exports.getEstablecimientoByIdEmp = async (idEmpresa, idEstablecimiento,nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_id = ? LIMIT 1`
            
            poolMysql.query(querySelectEstablecimiento, [idEmpresa, idEstablecimiento], (err, results) => {

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
                        message: 'no se encontro establecimiento'
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

exports.deleteEstablecimiento = async (idEmpresa, idEstablecimiento, nombreBd) => {
    return new Promise((resolve, reject) => {
        try {
            let queryDeleteEstablecimiento = `DELETE FROM ${nombreBd}.config_establecimientos WHERE cone_id = ? AND cone_empresa_id = ? LIMIT 1`;

            poolMysql.query(queryDeleteEstablecimiento, [idEstablecimiento, idEmpresa], function(error, results, fields){
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