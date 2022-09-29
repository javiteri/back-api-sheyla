const pool = require('../../../connectiondb/mysqlconnection');

exports.getListResumenCajaByIdEmp = async (idEmp,idUsuario,tipo,
    concepto,fechaIni,fechaFin) => {

        return new Promise((resolve, reject) => {
            try{
                let searchByUsuario = '';
                if(idUsuario && idUsuario != 0){
                    searchByUsuario = `AND ie_user = ${idUsuario}`;
                }
                let searchByTipo = '';
                if(tipo){
                    searchByTipo = `AND bc_tipo = '${tipo}'`
                }

                const sqlQueryGetListResumen = `SELECT bc_Fecha_hora AS fecha,bc_tipo AS tipo,bc_monto AS monto,bc_concepto AS concepto,
                                                usu_nombres AS responsable FROM bitacora_caja,usuarios 
                                                WHERE bc_empresa_id = ? AND usu_id=ie_user ${searchByTipo} AND bc_concepto LIKE ?
                                                ${searchByUsuario} AND bc_Fecha_hora BETWEEN ? AND ? ORDER BY bc_id`;
                
                pool.query(sqlQueryGetListResumen, [idEmp,"%"+concepto+"%",fechaIni,fechaFin], (error, results) => { 
                    
                    if(error){
                        reject({
                            isSucess: false,
                            code: 400,
                            messageError: 'ocurrio un error'
                        });
                        return;
                    }
                    
                    resolve({
                        isSucess: true,
                        code: 200,
                        data: results
                    });

                });

            }catch(exception){
                console.log(exception);
                console.log('error getListResumenCaja');
                reject({
                    status: 400,
                    error: 'error catch lista resumen'
                });
            }
        });
}


exports.getListValorCajaByIdEmp = async (idEmp) => {

        return new Promise((resolve, reject) => {
            try{

                const sqlQueryGetListValorCaja = `SELECT EMP_CAJA AS valorcaja FROM empresas WHERE EMP_ID = ?`;
                
                pool.query(sqlQueryGetListValorCaja, [idEmp], (error, results) => { 
                    
                    if(error){
                        reject({
                            isSucess: false,
                            code: 400,
                            messageError: 'ocurrio un error obteniendo valor caja'
                        });
                        return;
                    }
                    
                    resolve({
                        isSucess: true,
                        code: 200,
                        data: results[0]
                    });

                });

            }catch(exception){
                reject({
                    status: 400,
                    error: 'error catch get valor caja emp'
                });
            }
        });
}

exports.getListCuadreCajaMovimientosGrupo = async (idEmp, idUsuario,fechaIni,fechaFin) => {
    return new Promise((resolve, reject) => {
        try{
            let queryByUsu = ``;
            if(idUsuario == "0"){
                queryByUsu = `AND usu_id <> 0 `;
            }else{
                queryByUsu = `AND usu_id = ${idUsuario} `;
            }
            
            const sqlQueryMovimientosGrupo = `SELECT bc_tipo AS tipo,
                SUM(bc_monto) AS monto,ie_grupo AS grupo FROM bitacora_caja, usuarios
                WHERE bc_empresa_id = ? AND usu_id = ie_user AND (bc_tipo = 'INGRESO' || bc_tipo = 'EGRESO')
                AND bc_Fecha_hora BETWEEN ? AND ? 
                ${queryByUsu} GROUP BY  ie_grupo ORDER BY bc_id`;

            pool.query(sqlQueryMovimientosGrupo, [idEmp,fechaIni,fechaFin], function(error, results){
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error obteniendo lista movimientos'
                    });
                    return;
                }else{
                
                    if(results.length > 0){
                        const arrayResults = Array.from(results);
                       
                        getDataDetalleCuadreCaja(arrayResults,idEmp,fechaIni,fechaFin,idUsuario).then(function(returnedData){
                            console.log('returned data');
                            console.log(returnedData);
                            resolve({
                                isSucess: true,
                                code: 200,
                                data: arrayResults
                            });
                            return;

                        }).catch((error) =>{
                            console.log(error);
                              reject({
                                isSucess: false,
                                error: 'ocurrio un error obteniendo lista grupo caja'
                            });
                        });

                    }else{

                        resolve({
                            isSucess: true,
                            code: 200,
                            data: []
                        });
                        return;
                        
                    }
                
                }                

            });

        }catch(exception){
            console.log('error get Lista Cuadre Caja');
            reject({
                isSucess: false,
                error: 'ocurrio un error obteniendo lista grupo caja'
            });
        }
    });
};

async function getDataDetalleCuadreCaja(listGrupos,idEmp,fechaIni,fechaFin,idUser){
    let returnData = {};
    for(let i = 0; i < listGrupos.length; i++){
            await getListDetalleCuadreCajaByGrupo(idEmp,fechaIni,fechaFin,listGrupos[i].grupo,idUser).then(
                function(data) {
                    listGrupos[i]['listDetalle'] = data;
                }
            );
    }
    return returnData;
}

function getListDetalleCuadreCajaByGrupo(idEmp, fechaIni,fechaFin,grupo,idUser){

    let queryByUsu = ``;
    if(idUser == "0"){
        queryByUsu = `AND ie_user <> 0 `;
    }else{
        queryByUsu = `AND ie_user = ${idUser} `;
    }

    const sqlQuerySelectListVentasByGroup = `SELECT bc_Fecha_hora AS fecha, bc_monto AS monto, bc_concepto AS grupo FROM 
                    bitacora_caja WHERE bc_empresa_id = ? ${queryByUsu}
                    AND bc_Fecha_hora BETWEEN ? AND ? AND ie_grupo = ?`;

    return new Promise((resolve, reject) => {
        pool.query(sqlQuerySelectListVentasByGroup,[idEmp,fechaIni,fechaFin,grupo],function(errors, resultss){
            if (errors){
                console.log(errors);
                reject(errors);
            }  

            resolve(resultss);

        });
    });
}

exports.insertCuadreCajaByIdEmp = async (cuadreCajaData) => {
    return new Promise((resolve, reject) => {
        try{

            const {idEmp,fecha,tipo,concepto,idUser,grupo,monto} = cuadreCajaData;

            const sqlQueryInsertDataBitacora = `INSERT INTO bitacora_caja 
                    (bc_empresa_id,bc_fecha_hora,bc_tipo,bc_monto,bc_concepto,ie_user,ie_grupo) VALUES (?,?,?,?,?,?,?)`;
            const sqlQueryInsertDataBitacora2 = `INSERT INTO bitacora_caja 
                    (bc_empresa_id,bc_fecha_hora,bc_tipo,bc_monto,bc_concepto,ie_user,ie_grupo) VALUES (?,?,?,?,?,?,?)`;
            const sqlQueryUpdateCajaByIdEmp = `UPDATE empresas SET emp_caja = ? WHERE emp_id = ?`;
            const sqlQueryGetValueCajaEmp = `SELECT emp_caja AS valorcaja FROM empresas WHERE emp_id = ?`;

            pool.getConnection(function(error, connection){
                
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }

                    connection.query(sqlQueryInsertDataBitacora,
                        [idEmp,fecha,tipo,monto,concepto,idUser,grupo], function(error,results){
                        if(error){
                            connection.rollback(function(){ connection.release()});
                            reject({
                                isSuccess: false,
                                error: 'error insertando cuadre caja'
                            });
                            return;
                        }

                        connection.query(sqlQueryGetValueCajaEmp,[idEmp],function(errorr,resultss){
                            
                            if(errorr){
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSuccess: false,
                                    error: 'error obteniendo valor caja'
                                });
                                return;
                            }

                            if(resultss[0].valorcaja){
                                let tipoInsertNuevoSaldo = '';
                                let valorConceptoNuevoSaldo = '';

                                const valorCajaActual = resultss[0].valorcaja;
                                
                                if(valorCajaActual > 0){
                                    tipoInsertNuevoSaldo = 'EGRESO';
                                    valorConceptoNuevoSaldo = 'EGRESO Nuevo Saldo Caja'
                                }
                                if(valorCajaActual < 0){
                                    tipoInsertNuevoSaldo = 'INGRESO';
                                    valorConceptoNuevoSaldo = 'INGRESO Nuevo Saldo Caja'
                                }


                                connection.query(sqlQueryInsertDataBitacora2,
                                    [idEmp,fecha,tipoInsertNuevoSaldo,valorCajaActual,valorConceptoNuevoSaldo,
                                    idUser,'CUADRAR CAJA'], function(errorrr,resultsss){

                                        if(errorrr){
                                            console.log(errorrr);
                                            connection.rollback(function(){ connection.release()});
                                            reject({
                                                isSuccess: false,
                                                error: 'error insertando nuevo saldo'
                                            });
                                            return;
                                        }

                                        connection.query(sqlQueryUpdateCajaByIdEmp,['00.00',idEmp],function(errorrrr, resultssss){
                                            if(errorrrr){
                                                connection.rollback(function(){ connection.release()});
                                                reject({
                                                    isSuccess: false,
                                                    error: 'error actualizando valor cero caja'
                                                });
                                                return;
                                            }   

                                            connection.commit(function(errorComit){
                                                if(errorComit){
                                                    connection.rollback(function(){
                                                        connection.release();
                                                        reject('error actualizando valor caja');
                                                        return;
                                                    });   
                                                }
                                                
                                                connection.release();
                                                resolve({
                                                    isSuccess: true,
                                                    message: 'Cuadre de Caja Realizado Correctamente'
                                                })
                    
                                            });

                                        });

                                });


                            }else{
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSuccess: false,
                                    error: 'error, no se encuentro valor de caja'
                                });
                            }


                        });

                    });

                });
            });


        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                code: 400,
                error: 'ocurrio un error al insertar el cuadre de caja'
            });
        }
    });
}

exports.insertBitacoraIngresoOrEgreso = async (bitacoraData) => {
    return new Promise((resolve, reject) => {
        try{
            console.log('inside este');
            console.log(bitacoraData);
            const {idEmp,fecha,tipo,concepto,idUser,grupo,monto} = bitacoraData;

            
            const sqlQueryInsertDataBitacora = `INSERT INTO bitacora_caja 
                    (bc_empresa_id,bc_fecha_hora,bc_tipo,bc_monto,bc_concepto,ie_user,ie_grupo) VALUES (?,?,?,?,?,?,?)`;
            pool.query(sqlQueryInsertDataBitacora,[idEmp,fecha,tipo,monto,concepto,idUser,grupo],function(error, reslts){
               if(error){
                    reject({
                        isSuccess: false,
                        code:400,
                        error: 'ocurrio un error insertando en bitacora'   ,
                        message: error
                    });
                    return;
               } 

               console.log('insertada correctamente');
               resolve({
                    isSuccess: true,
                    code:200,
                    message: 'registro insertado correctamente'
               });

            });

        }catch(exception){
            console.log(exception);
            reject({
                isSuccess: false,
                code:400,
                error: 'ocurrio un error insertando en bitacora',
                message: exception
            });
        }
    });
}