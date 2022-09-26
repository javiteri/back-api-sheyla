const pool = require('../../../connectiondb/mysqlconnection')

exports.insertConfigsList = async (datosConfig) => {
    return new Promise((resolve, reject ) => {
        try{
            
            let queryExistConfig = "SELECT COUNT(*) AS CANT FROM config WHERE con_empresa_id = ? AND con_nombre_config = ?";
            let queryInsertConfig = `INSERT INTO config (con_empresa_id,con_nombre_config,con_valor) 
                                                 VALUES (?,?,?)`;
            let updateConfigIfExist = `UPDATE config SET con_valor = ? WHERE con_empresa_id = ? AND con_nombre_config = ?`;

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

                const configsListArray = Array.from(datosConfig);
                configsListArray.forEach((config, index) => {

                    const {idEmpresa,nombreConfig,valorConfig} = config;

                    connection.query(queryExistConfig, [idEmpresa, nombreConfig], function(errorr, result, fields){

                        if(errorr){
                            console.log(errorr);
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
                                    reject({
                                        isSucess: false,
                                        code: 400,
                                        messageError: 'ocurrio un error al actualizar config'
                                    });
                                    return;
                                }

                                if(index == configsListArray.length - 1){
                                    console.log('aqui se ejecutaria el commit');
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
                                    reject({
                                        isSucess: false,
                                        code: 400,
                                        messageError: 'ocurrio un error al insertar config'
                                    });
                                    return;
                                }

                                if(index == configsListArray.length - 1){
                                    console.log('aqui se ejecutaria el commit insert');
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

exports.getListConfigsByIdEmp = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectConfigs = `SELECT * FROM config WHERE con_empresa_id = ? ORDER BY con_id DESC `
            
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

exports.getConfigByIdEmp = async (idEmpresa, nombreConfig) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectConfigs = `SELECT * FROM config WHERE con_empresa_id = ? AND con_nombre_config = ? ORDER BY con_id DESC `
            
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