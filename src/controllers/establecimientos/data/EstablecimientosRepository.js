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
                if(!fs.existsSync(`${path}`)){
                    fs.mkdir(`${path}`,{recursive: true}, (err) => {
                        if (err) {
                            return console.error(err);
                        }
                        fs.writeFile(`${path}/${ruc}.${extensionFile}`, base64Image,{encoding: 'base64'}, function(error){
                            if(error){
                                console.log('inside error');
                                console.log(error);
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
            reject('error insertando datos establecimiento: ' + error) ; 
        }
    });
}


exports.getEstablecimientosByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectEstablecimientos = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ?`
            
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

function createDirectoryIfExist(pathDirectory){

}

function deleteImageFileByPath(pathImageLogo){
    fs.unlink(pathImageLogo, function(){
    });
}