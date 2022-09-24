const pool = require('../../../connectiondb/mysqlconnection')

exports.insertConfigsList = async (datosConfig) => {
    return new Promise((resolve, reject ) => {
        try{
            
            let queryExistConfig = "SELECT COUNT(*) AS CANT FROM config WHERE con_empresa_id = ? AND con_nombre_config = ?";
            let queryInsertUserDefaultEmpresa = `INSERT INTO config (con_empresa_id,con_nombre_config,con_valor) 
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
                    console.log('vuelta: ' + index);
                    console.log(config.nombreConfig);
                    const {idEmpresa,nombreConfig,valorConfig} = config;

                    connection.query(queryExistConfig, [idEmpresa, nombreConfig], function(errorr, result, fields){
                        console.log('inside exist Config: ' + nombreConfig);
                        console.log(result);

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
                            connection.query(updateConfigIfExist, [valorConfig,idEmpresa]);                            /*reject({
                                isSucess: false,
                                code: 400,
                                messageError: 'ya existe el cliente',
                                duplicate: true
                            });
                            return;*/

                        }

                        if(index == configsListArray.length - 1){
                            console.log('aqui se ejecutaria el commit');
                        }
                    });    
                });                

            });


            /*let queryExistConfig = "SELECT COUNT(*) AS CANT FROM config WHERE con_empresa_id = ? AND con_nombre_config = ?";
            let queryInsertUserDefaultEmpresa = `INSERT INTO config (con_empresa_id,con_nombre_config,con_valor) 
            VALUES (?,?,?)`;

            const {idEmpresa, nombreConfig, valorConfig} = datosConfig;
        
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

            });*/

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}