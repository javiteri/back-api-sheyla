const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');

exports.getListResumenCajaByIdEmp = async (idEmp,idUsuario,tipo,
                                    concepto,fechaIni,fechaFin, nombreBd) => {

        return new Promise(async (resolve, reject) => {
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
                                                usu_nombres AS responsable 
                                                FROM ${nombreBd}.bitacora_caja,${nombreBd}.usuarios 
                                                WHERE bc_empresa_id = ? AND usu_id=ie_user ${searchByTipo} AND bc_concepto LIKE ?
                                                ${searchByUsuario} AND bc_Fecha_hora BETWEEN ? AND ? ORDER BY bc_id`;
                
                let results = await pool.query(sqlQueryGetListResumen, [idEmp,"%"+concepto+"%",fechaIni,fechaFin]); 
                resolve({
                    isSucess: true,
                    code: 200,
                    data: results[0]
                });

            }catch(exception){
                reject({
                    status: 400,
                    error: 'error catch lista resumen'
                });
            }
        });
}


exports.getListValorCajaByIdEmp = async (idEmp, nombreBd) => {

        return new Promise(async (resolve, reject) => {
            try{

                const sqlQueryGetListValorCaja = `SELECT EMP_CAJA AS valorcaja FROM ${nombreBd}.empresas WHERE EMP_ID = ?`;
                
                let results = await pool.query(sqlQueryGetListValorCaja, [idEmp]);
                resolve({
                    isSucess: true,
                    code: 200,
                    data: results[0][0]
                });

            }catch(exception){
                reject({
                    status: 400,
                    error: 'error catch get valor caja emp'
                });
            }
        });
}

exports.getListCuadreCajaMovimientosGrupo = async (idEmp, idUsuario,fechaIni,fechaFin, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{
            let queryByUsu = ``;
            if(idUsuario == "0"){
                queryByUsu = `AND usu_id <> 0 `;
            }else{
                queryByUsu = `AND usu_id = ${idUsuario} `;
            }
            
            const sqlQueryMovimientosGrupo = `SELECT bc_tipo AS tipo,
                SUM(bc_monto) AS monto,ie_grupo AS grupo 
                FROM ${nombreBd}.bitacora_caja, ${nombreBd}.usuarios
                WHERE bc_empresa_id = ? AND usu_id = ie_user AND (bc_tipo = 'INGRESO' || bc_tipo = 'EGRESO')
                AND bc_Fecha_hora BETWEEN ? AND ? 
                ${queryByUsu} GROUP BY  ie_grupo ORDER BY bc_id`;

            let results = await pool.query(sqlQueryMovimientosGrupo, [idEmp,fechaIni,fechaFin]);
            if(results[0].length > 0){
                const arrayResults = Array.from(results[0]);
                
                getDataDetalleCuadreCaja(arrayResults,idEmp,fechaIni,fechaFin,idUsuario, nombreBd).then(function(returnedData){
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

        }catch(exception){
            reject({
                isSucess: false,
                error: 'ocurrio un error obteniendo lista grupo caja'
            });
        }
    });
};

async function getDataDetalleCuadreCaja(listGrupos,idEmp,fechaIni,fechaFin,idUser, nombreBd){
    let returnData = {};
    for(let i = 0; i < listGrupos.length; i++){
            await getListDetalleCuadreCajaByGrupo(idEmp,fechaIni,fechaFin,listGrupos[i].grupo,idUser, nombreBd).then(
                function(data) {
                    listGrupos[i]['listDetalle'] = data;
                }
            );
    }
    return returnData;
}

function getListDetalleCuadreCajaByGrupo(idEmp, fechaIni,fechaFin,grupo,idUser, nombreBd){

    let queryByUsu = ``;
    if(idUser == "0"){
        queryByUsu = `AND ie_user <> 0 `;
    }else{
        queryByUsu = `AND ie_user = ${idUser} `;
    }

    const sqlQuerySelectListVentasByGroup = `SELECT bc_Fecha_hora AS fecha, bc_monto AS monto, bc_concepto AS grupo FROM 
                    ${nombreBd}.bitacora_caja WHERE bc_empresa_id = ? ${queryByUsu}
                    AND bc_Fecha_hora BETWEEN ? AND ? AND ie_grupo = ?`;

    return new Promise(async (resolve, reject) => {
        let resultss = await pool.query(sqlQuerySelectListVentasByGroup,[idEmp,fechaIni,fechaFin,grupo]);
        resolve(resultss[0]);
    });
}

exports.insertCuadreCajaByIdEmp = async (cuadreCajaData) => {
    return new Promise(async (resolve, reject) => {

        let conexion = await pool.getConnection();
        try{

            const {idEmp,fecha,tipo,concepto,idUser,grupo,monto,nombreBd} = cuadreCajaData;

            const sqlQueryInsertDataBitacora = `INSERT INTO ${nombreBd}.bitacora_caja 
                    (bc_empresa_id,bc_fecha_hora,bc_tipo,bc_monto,bc_concepto,ie_user,ie_grupo) VALUES (?,?,?,?,?,?,?)`;
            const sqlQueryInsertDataBitacora2 = `INSERT INTO ${nombreBd}.bitacora_caja 
                    (bc_empresa_id,bc_fecha_hora,bc_tipo,bc_monto,bc_concepto,ie_user,ie_grupo) VALUES (?,?,?,?,?,?,?)`;
            const sqlQueryUpdateCajaByIdEmp = `UPDATE ${nombreBd}.empresas SET emp_caja = ? WHERE emp_id = ?`;
            const sqlQueryGetValueCajaEmp = `SELECT emp_caja AS valorcaja FROM ${nombreBd}.empresas WHERE emp_id = ?`;

            await conexion.beginTransaction();
            await conexion.query(sqlQueryInsertDataBitacora, [idEmp,fecha,tipo,monto,concepto,idUser,grupo]);

            let resultss = await conexion.query(sqlQueryGetValueCajaEmp,[idEmp]);
            
            if(resultss[0][0].valorcaja){
                let tipoInsertNuevoSaldo = '';
                let valorConceptoNuevoSaldo = '';

                const valorCajaActual = resultss[0][0].valorcaja;
                
                if(valorCajaActual > 0){
                    tipoInsertNuevoSaldo = 'EGRESO';
                    valorConceptoNuevoSaldo = 'EGRESO Nuevo Saldo Caja'
                }
                if(valorCajaActual < 0){
                    tipoInsertNuevoSaldo = 'INGRESO';
                    valorConceptoNuevoSaldo = 'INGRESO Nuevo Saldo Caja'
                }

                await conexion.query(sqlQueryInsertDataBitacora2,
                                    [idEmp,fecha,tipoInsertNuevoSaldo,valorCajaActual,valorConceptoNuevoSaldo,
                                    idUser,'CUADRAR CAJA']);

                await conexion.query(sqlQueryUpdateCajaByIdEmp,['00.00',idEmp]);

                await conexion.commit();
                conexion.release();
                resolve({
                    isSuccess: true,
                    message: 'Cuadre de Caja Realizado Correctamente'
                })
                
            }else{
                await conexion.rollback();
                conexion.release();

                reject({
                    isSuccess: false,
                    error: 'error, no se encuentro valor de caja'
                });
            }

        }catch(exception){
            
            await conexion.rollback();
            conexion.release();

            reject({
                isSucess: false,
                code: 400,
                error: 'ocurrio un error al insertar el cuadre de caja'
            });
        }
    });
}

exports.insertBitacoraIngresoOrEgreso = async (bitacoraData) => {
    return new Promise(async (resolve, reject) => {
        try{
            const {idEmp,fecha,tipo,concepto,idUser,grupo,monto,nombreBd} = bitacoraData;

            const sqlQueryInsertDataBitacora = `INSERT INTO ${nombreBd}.bitacora_caja 
                    (bc_empresa_id,bc_fecha_hora,bc_tipo,bc_monto,bc_concepto,ie_user,ie_grupo) VALUES (?,?,?,?,?,?,?)`;
            await pool.query(sqlQueryInsertDataBitacora,[idEmp,fecha,tipo,monto,concepto,idUser,grupo]);
            
            resolve({
                isSuccess: true,
                code:200,
                message: 'registro insertado correctamente'
            });

        }catch(exception){
            reject({
                isSuccess: false,
                code:400,
                error: 'ocurrio un error insertando en bitacora',
                message: exception
            });
        }
    });
}


exports.getListaMovimientosCajaExcel = async (idEmp,idUsuario,tipo,concepto,fechaIni,fechaFin,nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileMovimientosCaja(idEmp,idUsuario,tipo,
                                        concepto,fechaIni,fechaFin,nombreBd);
            valueResultPromise.then( 
                function (data) {
                    resolve(data);
                },
                function (error) {
                    resolve(error);
                }
            );
        }catch(exception){
            reject('error creando excel');
        }
    });
}

function createExcelFileMovimientosCaja(idEmp,idUsuario,tipo,concepto,fechaIni,fechaFin, nombreBd){

    return new Promise(async (resolve, reject) => {
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
                                                usu_nombres AS responsable 
                                                FROM ${nombreBd}.bitacora_caja,${nombreBd}.usuarios 
                                                WHERE bc_empresa_id = ? AND usu_id=ie_user ${searchByTipo} AND bc_concepto LIKE ?
                                                ${searchByUsuario} AND bc_Fecha_hora BETWEEN ? AND ? ORDER BY bc_id`;
                
                let results = await pool.query(sqlQueryGetListResumen, [idEmp,"%"+concepto+"%",fechaIni,fechaFin]);
                
                const arrayData = Array.from(results[0]);

                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Lista Compras");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Fecha Hora', key:'fecha', width: 20},
                    {header: 'Tipo', key:'tipo',width: 20},
                    {header: 'Monto', key:'monto',width: 20},
                    {header: 'Concepto', key:'concepto',width: 40},
                    {header: 'Responsable', key:'responsable',width: 30}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        fecha: valor.fecha,
                        tipo: valor.tipo,
                        monto: valor.monto,
                        concepto: valor.concepto,
                        responsable: valor.responsable
                    }
                    worksheet.addRow(valorInsert);
                });

                // Making first line in excel
                worksheet.getRow(1).eachCell((cell) => {
                    cell.font = {bold: true},
                    cell.border = {
                        top: {style:'thin'},
                        left: {style:'thin'},
                        bottom: {style:'thin'},
                        right: {style:'thin'}
                    }
                });

                try{

                    const nameFile = `/${Date.now()}_movcaja.xlsx`;
            
                    if(!fs.existsSync(`${path}`)){
                        fs.mkdir(`${path}`,{recursive: true}, (err) => {
                            if (err) {
                                return console.error(err);
                            }
            
                            workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            
                                resolve({
                                    isSucess: true,
                                    message: 'archivo creado correctamente',
                                    pathFile: `${path}${nameFile}`
                                });

                            });
                        });
                    }else{
                        
                        workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            resolve({
                                isSucess: true,
                                message: 'archivo creado correctamente',
                                pathFile: `${path}${nameFile}`
                            });
                        });
                    }
            
                }catch(exception){
                    console.log(`exception`);
                    console.log(exception);
            
                    reject({
                        isSucess: false,
                        error: 'error creando archivo, reintente'
                    });
                }

        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}