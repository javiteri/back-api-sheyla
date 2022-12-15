const pool = require('../../../connectiondb/mysqlconnection')
const poolMysqlBd1 = require('../../../connectiondb/mysqlconnectionlogin');

exports.insertConfigsList = async (datosConfig) => {
    return new Promise((resolve, reject ) => {
        try{

            const configsListArray = Array.from(datosConfig);
            const nombreBd = configsListArray[0].nombreBd;

            let queryExistConfig = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.config WHERE con_empresa_id = ? AND con_nombre_config = ?`;
            let queryInsertConfig = `INSERT INTO ${nombreBd}.config (con_empresa_id,con_nombre_config,con_valor) 
                                                 VALUES (?,?,?)`;
            let updateConfigIfExist = `UPDATE ${nombreBd}.config SET con_valor = ? WHERE con_empresa_id = ? AND con_nombre_config = ?`;

            pool.getConnection(function(error, connection){
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }
                });

                configsListArray.forEach((config, index) => {

                    const {idEmpresa,nombreConfig,valorConfig} = config;

                    connection.query(queryExistConfig, [idEmpresa, nombreConfig], function(errorr, result, fields){

                        if(errorr){
                            console.log(errorr);
                            connection.release();
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: errorr
                            });
                            return;
                        }
        
                        const cantClients = result[0].CANT;
                        if(cantClients >= 1){
                            connection.query(updateConfigIfExist, [valorConfig,idEmpresa,nombreConfig], function(error, resultsss) {
                                if(error){
                                    connection.release();
                                    reject({
                                        isSucess: false,
                                        code: 400,
                                        messageError: 'ocurrio un error al actualizar config'
                                    });
                                    return;
                                }

                                if(index == configsListArray.length - 1){
                                    connection.commit(function(errorComit){
                                        if(errorComit){
                                            connection.rollback(function(){
                                                connection.release();
                                                reject('error actualizando config');
                                                return;
                                            });
                                        }
            
                                        connection.release();
                                        resolve({
                                            isSuccess: true,
                                            message: 'config actualizada correctamente'
                                        })
            
                                    });
                                }


                            }); 
                        }else{
                            connection.query(queryInsertConfig, [idEmpresa,nombreConfig,valorConfig], function(errorr, resultsss) {
                                if(errorr){
                                    console.log(errorr);
                                    connection.release();
                                    reject({
                                        isSucess: false,
                                        code: 400,
                                        messageError: 'ocurrio un error al insertar config'
                                    });
                                    return;
                                }

                                if(index == configsListArray.length - 1){
                                    connection.commit(function(errorComit){
                                        if(errorComit){
                                            connection.rollback(function(){
                                                connection.release();
                                                reject('error insetando config');
                                                return;
                                            });   
                                        }
            
                                        connection.release();
                                        resolve({
                                            isSuccess: true,
                                            message: 'config insertada correctamente'
                                        })
            
                                    });
                                }
                            });
                        }
 
                    });    
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

exports.insertConfigsListFacElec = async (datosConfig) => {
    return new Promise((resolve, reject ) => {
        try{
            
            let nombreBd = datosConfig.nombreBd;            
            let queryDeleteFacElectronicaConfig = `DELETE FROM ${nombreBd}.config WHERE con_nombre_config LIKE ? AND con_empresa_id = ?`;
            let queryInsertConfig = `INSERT INTO ${nombreBd}.config (con_empresa_id,con_nombre_config,con_valor) VALUES ?`;

            pool.getConnection(function(error, connection){
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }

                    
                    connection.query(queryDeleteFacElectronicaConfig, ['%FAC_ELECTRONICA%', datosConfig.datos[0][0]], function(error, results){
                        
                        if(error){
                            console.log(error);
                            connection.rollback(function(){ connection.release()});
                            reject('error insertando List Config');
                            return;
                        }
                        connection.query(queryInsertConfig, [datosConfig.datos], function(err, resultss){
                            if(err){
                                connection.rollback(function(){ connection.release()});
                                reject('error insertando List Config');
                                return;
                            }
                            
                            connection.commit(function(errorComit){
                                if(errorComit){
                                    connection.rollback(function(){
                                        connection.release();
                                        reject('error insertando la venta');
                                        return;
                                    });   
                                }
    
                                connection.release();
                                resolve({
                                    isSuccess: true,
                                    message: 'config electronica actualizada correctamente'
                                })
    
                            });

                        });
                    });

                });
            });

        }catch(error){
            console.log(error);
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.getListConfigsByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectConfigs = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id = ? ORDER BY con_id DESC `
            
            pool.query(querySelectConfigs, [idEmpresa], (err, results) => {

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

exports.getConfigByIdEmp = async (idEmpresa, nombreConfig, nombreBd) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectConfigs = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id = ? AND con_nombre_config = ? ORDER BY con_id DESC `
            
            pool.query(querySelectConfigs, [idEmpresa, nombreConfig], (err, results) => {

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

exports.insertFileNameFirmaElec = async(claveFirma,rucEmpresa, nombreFirma) => {

    return new Promise((resolve, reject) => {
        
        try{
            const sqlInsertRutaAndClaveFirma = `UPDATE efactura_factura.empresas SET EMPRESA_CLAVE_FIRMA = ?, EMPRESA_RUTA_FIRMA = ? WHERE EMPRESA_RUC = ? `;
            const sqlInsertRutaFirma = `UPDATE efactura_factura.empresas SET EMPRESA_RUTA_FIRMA = ? WHERE EMPRESA_RUC = ? `;
            const sqlInsertClaveFirma = `UPDATE efactura_factura.empresas SET EMPRESA_CLAVE_FIRMA = ? WHERE EMPRESA_RUC = ? `;

            if(claveFirma && nombreFirma){
                poolMysqlBd1.query(sqlInsertRutaAndClaveFirma, [claveFirma,nombreFirma,rucEmpresa], function(error, results){
                    if(error){
                        console.log(error);
                        reject({
                            isSuccess: false,
                            message: 'error actualizando datos empresa firma'
                        });
                        return;
                    }
    
                    resolve({
                        isSuccess: true,
                        message: 'valores actualizados'
                    });

                    return;
                }); 
            }

            if(claveFirma){
                poolMysqlBd1.query(sqlInsertClaveFirma, [claveFirma,rucEmpresa], function(error, results){
                    if(error){
                        console.log(error);
                        reject({
                            isSuccess: false,
                            message: 'error actualizando datos empresa firma'
                        });
                        return;
                    }
    
                    resolve({
                        isSuccess: true,
                        message: 'valores actualizados'
                    });
                    return;
                });
            }

            if(nombreFirma){
                poolMysqlBd1.query(sqlInsertRutaFirma, [nombreFirma,rucEmpresa], function(error, results){
                    if(error){
                        console.log(error);
                        reject({
                            isSuccess: false,
                            message: 'error actualizando datos empresa firma'
                        });
                        return;
                    }
    
                    resolve({
                        isSuccess: true,
                        message: 'valores actualizados'
                    });
                    return;
                });
            }


        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                message: 'Ocurrio un error isertando ruta firma'
            });
        }
    });
}

exports.getConfigsFirmaElecNameAndPassword = async(ruc) => {
    return new Promise((resolve, reject) => {
        try {
            const querySelectDatosFirma = `SELECT EMPRESA_RUTA_FIRMA, EMPRESA_CLAVE_FIRMA FROM empresas WHERE EMPRESA_RUC = ? `;
            poolMysqlBd1.query(querySelectDatosFirma, [ruc], function(error, results){
                if(error){
                    reject({
                        isSuccess: false,
                        mensaje: 'error obteniedo datos de firma electronica'
                    });
                    return;
                }

                resolve({
                    isSuccess: true,
                    data: results[0]
                });
            });

        }catch(exception){
            reject({
                isSuccess: false,
                mensaje: 'error al obtener datos firma electronica'
            });
        }
    });
}