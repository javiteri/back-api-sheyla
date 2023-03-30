const pool = require('../../../connectiondb/mysqlconnection')
const poolMysqlBd1 = require('../../../connectiondb/mysqlconnectionlogin');

exports.insertConfigsList = async (datosConfig) => {
    return new Promise(async (resolve, reject ) => {

        let conexion = await pool.getConnection();

        try{
            const configsListArray = Array.from(datosConfig);
            const nombreBd = configsListArray[0].nombreBd;

            let queryExistConfig = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.config WHERE con_empresa_id = ? AND con_nombre_config = ?`;
            let queryInsertConfig = `INSERT INTO ${nombreBd}.config (con_empresa_id,con_nombre_config,con_valor) 
                                                 VALUES (?,?,?)`;
            let updateConfigIfExist = `UPDATE ${nombreBd}.config SET con_valor = ? WHERE con_empresa_id = ? AND con_nombre_config = ?`;

            await conexion.beginTransaction();

            for(let index = 0; index < configsListArray.length; index++){
                let config = configsListArray[index];

                const {idEmpresa,nombreConfig,valorConfig} = config;

                let result = await conexion.query(queryExistConfig, [idEmpresa, nombreConfig]);
                const cantClients = result[0][0].CANT;
                if(cantClients >= 1){
                    await conexion.query(updateConfigIfExist, [valorConfig,idEmpresa,nombreConfig]);

                    if(index == configsListArray.length - 1){
                        await conexion.commit();
                        conexion.release();

                        resolve({
                            isSuccess: true,
                            message: 'config actualizada correctamente'
                        });
                    }
                }else{
                    await conexion.query(queryInsertConfig, [idEmpresa,nombreConfig,valorConfig]);
                    if(index == configsListArray.length - 1){
                        await conexion.commit();
                        conexion.release();

                        resolve({
                            isSuccess: true,
                            message: 'config insertada correctamente'
                        });
                    }
                }
            }

        }catch(error){
            await conexion.rollback();
            conexion.release();

            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.insertConfigsListFacElec = async (datosConfig) => {
    return new Promise(async (resolve, reject ) => {

        let conexion = await pool.getConnection();

        try{
            
            let nombreBd = datosConfig.nombreBd;            
            let queryDeleteFacElectronicaConfig = `DELETE FROM ${nombreBd}.config WHERE con_nombre_config LIKE ? AND con_empresa_id = ?`;
            let queryInsertConfig = `INSERT INTO ${nombreBd}.config (con_empresa_id,con_nombre_config,con_valor) VALUES ?`;

            await conexion.beginTransaction();
            await conexion.query(queryDeleteFacElectronicaConfig, ['%FAC_ELECTRONICA%', datosConfig.datos[0][0]]);
            await conexion.query(queryInsertConfig, [datosConfig.datos]);
            
            await conexion.commit();
            conexion.release();

            resolve({
                isSuccess: true,
                message: 'config electronica actualizada correctamente'
            });

        }catch(error){
            await conexion.rollback();
            conexion.release();

            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.getListConfigsByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectConfigs = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id = ? ORDER BY con_id DESC `
            
            let results = await pool.query(querySelectConfigs, [idEmpresa]); 
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

exports.getConfigByIdEmp = async (idEmpresa, nombreConfig, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectConfigs = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id = ? AND con_nombre_config LIKE ? ORDER BY con_id DESC `;
            
            let results = await pool.query(querySelectConfigs, [idEmpresa, nombreConfig]);
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

exports.insertFileNameFirmaElec = async(claveFirma,rucEmpresa, nombreFirma) => {

    return new Promise(async (resolve, reject) => {
        
        try{
            const sqlInsertRutaAndClaveFirma = `UPDATE efactura_factura.empresas SET EMPRESA_CLAVE_FIRMA = ?, EMPRESA_RUTA_FIRMA = ? WHERE EMPRESA_RUC = ? `;
            const sqlInsertRutaFirma = `UPDATE efactura_factura.empresas SET EMPRESA_RUTA_FIRMA = ? WHERE EMPRESA_RUC = ? `;
            const sqlInsertClaveFirma = `UPDATE efactura_factura.empresas SET EMPRESA_CLAVE_FIRMA = ? WHERE EMPRESA_RUC = ? `;

            if(claveFirma && nombreFirma){
                await poolMysqlBd1.query(sqlInsertRutaAndClaveFirma, [claveFirma,nombreFirma,rucEmpresa]);

                resolve({
                    isSuccess: true,
                    message: 'valores actualizados'
                });

                return;
            }

            if(claveFirma){
                await poolMysqlBd1.query(sqlInsertClaveFirma, [claveFirma,rucEmpresa]);
                resolve({
                    isSuccess: true,
                    message: 'valores actualizados'
                });
                return;
            }

            if(nombreFirma){
                await poolMysqlBd1.query(sqlInsertRutaFirma, [nombreFirma,rucEmpresa]);
                resolve({
                    isSuccess: true,
                    message: 'valores actualizados'
                });
                return;
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
    return new Promise(async (resolve, reject) => {
        try {
            const querySelectDatosFirma = `SELECT EMPRESA_RUTA_FIRMA, EMPRESA_CLAVE_FIRMA FROM empresas WHERE EMPRESA_RUC = ? `;
            let results = await poolMysqlBd1.query(querySelectDatosFirma, [ruc]);
            resolve({
                isSuccess: true,
                data: results[0][0]
            });
        }catch(exception){
            reject({
                isSuccess: false,
                mensaje: 'error al obtener datos firma electronica'
            });
        }
    });
}