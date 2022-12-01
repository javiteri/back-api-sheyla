const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');
const sharedFunctions = require('../../../util/sharedfunctions');


exports.insertVenta = async (datosVenta) => {

    return new Promise((resolve, reject) => {
        try{

            const {empresaId,tipoVenta,venta001,venta002,ventaNumero,ventaFechaHora,
                    usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,formaPago,obs} = datosVenta;
            const ventaDetallesArray = datosVenta['ventaDetalles'];
            
            // INSERT VENTA Y OBTENER ID
                // INSERTAR EN EL CAMPO UNICO CORRESPONDIENTE
                // SI SALTA QUE YA EXISTE ENTONCES ENVIAR UN MENSAJE AL CLIENTE PARA QUE SE MUESTRE
                // SI TODO ESTA CORRECTO SEGUIR CON LA INSERCION DEL DETALLE DE LA VENTA
            // INSERT VENTA DETALLE CON EL ID DE LA VENTA RECIBIDO
            // EN CADA VENTA DETALLE SE DEBE BAJAR EL STOCK DEL PRODUCTO CORRESPONDIENTE
            const sqlQueryInsertVenta = `INSERT INTO ventas (venta_empresa_id,venta_tipo, 
                                        venta_001,venta_002,venta_numero,venta_fecha_hora,venta_usu_id,venta_cliente_id, 
                                        venta_subtotal_12,venta_subtotal_0,venta_valor_iva,venta_total,venta_forma_pago, 
                                        venta_observaciones, venta_unico) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
            const sqlQueryInsertVentaDetalle = `INSERT INTO ventas_detalles (ventad_venta_id,ventad_prod_id,ventad_cantidad, 
                                                ventad_iva,ventad_producto,ventad_vu,ventad_descuento,ventad_vt) VALUES 
                                                (?,?,?,?,?,?,?,?)`
            const sqlQueryUpdateStockProducto = `UPDATE productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ?`
                
            pool.getConnection(function(error, connection){

                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }
                    
                    connection.query(sqlQueryInsertVenta, [empresaId,tipoVenta,venta001,venta002,ventaNumero,
                                    ventaFechaHora,usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,
                                    formaPago,obs, `${empresaId}_${tipoVenta}_${venta001}_${venta002}_${ventaNumero}`], function(erro, results){
                        if(erro){
                            
                            connection.rollback(function(){ connection.release()});
                            reject({
                                isSuccess: false,
                                error: 'error insertando Venta',
                                isDuplicate: 
                                (erro.sqlMessage.includes('Duplicate entry') || erro.sqlMessage.includes('venta_unico'))
                            });
                            return;
                        }

                        const idVentaGenerated = results.insertId;

                        const arrayListVentaDetalle = Array.from(ventaDetallesArray);
                        arrayListVentaDetalle.forEach((ventaDetalle, index) => {

                            const {prodId, cantidad,iva,nombreProd,
                                valorUnitario,descuento,valorTotal} = ventaDetalle;
                            
                            connection.query(sqlQueryInsertVentaDetalle, [idVentaGenerated,prodId,
                                            cantidad,iva,nombreProd,valorUnitario,
                                            descuento,valorTotal], function(errorr, results){

                                if(errorr){
                                    connection.rollback(function(){ connection.release()});
                                    reject('error insertando Venta Detalle');
                                    return;
                                }

                                //UPDATE productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ? AND
                                connection.query(sqlQueryUpdateStockProducto,[cantidad,empresaId,prodId], function(errorrr, results){
                                    if(errorrr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error descontando inventario');
                                        return;
                                    }

                                    if(index == arrayListVentaDetalle.length - 1){
                                        
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
                                                message: 'Venta insertada correctamente',
                                                ventaid: idVentaGenerated
                                            })
                
                                        });
                                    }

                                });

                            });
                        });

                    });

                });

            });
            
        }catch(exp){
            console.log('error insertando venta');
            console.log(exp);
        }
    });
}

exports.updateEstadoAnuladoVentaByIdEmpresa = async (datos) => {
    return new Promise((resolve, reject) => {
        try{
            const {idEmpresa,idVenta,estado} = datos;
            const sqlSelectDetalleVenta = `SELECT * FROM ventas_detalles WHERE ventad_venta_id = ?`;
            const sqlUpdateEstadoVenta = `UPDATE ventas SET venta_anulado = ? WHERE venta_id = ? AND venta_empresa_id = ?`;
            const sqlQueryUpdateStockProducto = `UPDATE productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`;

            pool.getConnection(function(error, connection){
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }

                    connection.query(sqlUpdateEstadoVenta, [estado,idVenta,idEmpresa], function(errorr, result){
                        if(errorr){
                            connection.rollback(function(){ connection.release()});
                            reject({
                                isSucess: false,
                                code: 400,
                                message: errorr.message
                            });
                            return;
                        }
                        
                        connection.query(sqlSelectDetalleVenta, [idVenta], function(erro, results){
                            if(erro){
                                
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSucess: false,
                                    code: 400,
                                    message: erro.message
                                });
                                return;
                            }
                            
                            const listVentaDetalle = Array.from(results);
                            
                            listVentaDetalle.forEach((ventaDetalle, index) => {
                                const cantidad = ventaDetalle.ventad_cantidad;
                                const prodId = ventaDetalle.ventad_prod_id;
                                
                                
                                connection.query(sqlQueryUpdateStockProducto,[cantidad,idEmpresa,prodId], function(errorrr, results){
                                    if(errorrr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error sumando inventario');
                                        return;
                                    }

                                    if(index == listVentaDetalle.length - 1){
                                        connection.commit(function(errorComit){
                                            if(errorComit){
                                                connection.rollback(function(){
                                                    connection.release();
                                                    reject('error actualizando estado venta');
                                                    return;
                                                });   
                                            }
                                            connection.release();
                                            resolve({
                                                isSuccess: true,
                                                message: 'Venta anulada correctamente'
                                            })
                                        });
                                    }
                                });

                            });


                        });

                    });                    
                });
            });

        }catch(exp){
            console.log('error actualizando update estado venta');
            console.log(exp);
        }
    });
}

exports.deleteVentaEstadoAnuladoByIdEmpresa = async (datos) => {
    return new Promise((resolve, reject) => {

        try{

            const {idEmpresa,idVenta,estado} = datos;

            const sqlSelectDetalleVenta = `SELECT * FROM ventas_detalles WHERE ventad_venta_id = ?`;
            const sqlQueryUpdateStockProducto = `UPDATE productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`;
            const queryDeleteVentaByIdEmp = `DELETE FROM ventas WHERE venta_id = ? AND venta_empresa_id = ? LIMIT 1`;
            const queryDeleteVentaDetalleByIdEmp = `DELETE FROM ventas_detalles WHERE ventad_venta_id = ?`;

            pool.getConnection(function(error, connection){
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }

                    if(estado == 0){

                        connection.query(sqlSelectDetalleVenta, [idVenta], function(erro, results){
                            if(erro){
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSucess: false,
                                    code: 400,
                                    message: erro.message
                                });
                                return;
                            }

                            const listVentaDetalle = Array.from(results);
                            listVentaDetalle.forEach((ventaDetalle, index) => {
                                const cantidad = ventaDetalle.ventad_cantidad;
                                const prodId = ventaDetalle.ventad_prod_id;
                                
                                connection.query(sqlQueryUpdateStockProducto,[cantidad,idEmpresa,prodId], function(errorrr, results){
                                    if(errorrr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error sumando inventario');
                                        return;
                                    }
                                   
                                    if(index == listVentaDetalle.length - 1){
                                        connection.query(queryDeleteVentaByIdEmp, [idVenta,idEmpresa], function (errores, resultsss){
                                            if(errores){
                                                connection.rollback(function(){ connection.release()});
                                                reject({
                                                    isSucess: false,
                                                    code: 400,
                                                    message: errores.message
                                                });
                                                return;
                                            }
        
                                            connection.commit(function(errorComit){
                                                if(errorComit){
                                                    connection.rollback(function(){
                                                        connection.release();
                                                        reject('error eliminando venta');
                                                        return;
                                                    });   
                                                }
                                                connection.release();
                                                resolve({
                                                    isSuccess: true,
                                                    message: 'Venta eliminada correctamente'
                                                })
                                            });
        
                                        });
                                    }

                                });
                            });

                            

                        });

                    }else{
                        connection.query(queryDeleteVentaByIdEmp, [idVenta, idEmpresa], function (errores, resultsss){
                            if(errores){
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSucess: false,
                                    code: 400,
                                    message: errores.message
                                });
                                return;
                            }

                            connection.commit(function(errorComit){
                                if(errorComit){
                                    connection.rollback(function(){
                                        connection.release();
                                        reject('error eliminando venta');
                                        return;
                                    });   
                                }
                                connection.release();
                                resolve({
                                    isSuccess: true,
                                    message: 'Venta eliminada correctamente'
                                })
                            });

                        });
                    }
                });
            });

        }catch(exception){
            console.log('error eliminando venta');
            console.log(exception);
        }
    });
}

exports.getListVentasByIdEmpresa = async (idEmp, nombreOrCiRuc, noDoc, fechaIni, fechaFin) => {
    return new Promise((resolve, reject) => {
        try{
            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombreOrCiRuc){
            
                const containsNumber =  /^[0-9]*$/.test(nombreOrCiRuc);
                valueCiRucClient = containsNumber ? nombreOrCiRuc : "";

                const containsText =  !containsNumber;///^[A-Za-z]*$/.test(nombreOrCiRuc);
                valueNombreClient = containsText ? nombreOrCiRuc : "";

            }

            const queryGetListaVentas = `SELECT venta_id as id, venta_fecha_hora AS fechaHora, venta_tipo AS documento,CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numero,
                                         venta_anulado as anulado, venta_total AS total,usu_username AS usuario,cli_nombres_natural AS cliente, cli_documento_identidad AS cc_ruc_pasaporte,
                                         venta_forma_pago AS forma_pago,venta_observaciones AS 'Observaciones' 
                                         FROM ventas,clientes,usuarios WHERE venta_empresa_id=? AND venta_usu_id=usu_id AND venta_cliente_id=cli_id 
                                         AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
                                         CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ?
                                         AND  venta_fecha_hora  BETWEEN ? AND ? ORDER BY venta_id DESC`;
            pool.query(queryGetListaVentas, 
                [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc+"%", 
                fechaIni+" 00:00:00",fechaFin+" 23:59:59"], (error, results) => {

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
            console.log('error obteniendo lista de ventas');
            console.log(exception);
        }
    });
}

exports.getListResumenVentasByIdEmpresa = async (idEmp, nombreOrCiRuc, noDoc, fechaIni, fechaFin) => {
    return new Promise((resolve, reject) => {
        try{
            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombreOrCiRuc){
                const containsNumber =  /^[0-9]*$/.test(nombreOrCiRuc);
                valueCiRucClient = containsNumber ? nombreOrCiRuc : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombreOrCiRuc : "";
            }

            const queryGetListaResumenVentas = `SELECT venta_fecha_hora AS fechaHora, venta_tipo AS documento,CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numero,
            cli_nombres_natural AS cliente,cli_documento_identidad AS cc_ruc_pasaporte,venta_forma_pago AS forma_pago,venta_subtotal_12 AS subtotalIva,
            venta_subtotal_0 AS subtotalCero, venta_valor_iva AS valorIva,venta_total AS total FROM ventas,clientes,usuarios WHERE venta_empresa_id=? 
            AND venta_usu_id=usu_id AND venta_cliente_id=cli_id AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ?
            AND venta_fecha_hora BETWEEN ? AND ? AND venta_anulado=0 `;

            pool.query(queryGetListaResumenVentas, 
                [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc+"%",
                fechaIni+" 00:00:00",fechaFin+" 23:59:59"], (error, results) => {

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
            console.log('error obteniendo lista resumen ventas');
            console.log(exception);
        }
    });
};


exports.getOrCreateConsFinalByIdEmp = async (idEmp) => {
    return new Promise((resolve, reject) => {
        try{
            const consumidorFinalName = 'CONSUMIDOR FINAL';

            const queryGetConsumidorFinal = `SELECT * FROM clientes WHERE cli_empresa_id = ? AND cli_nombres_natural LIKE ? LIMIT 1`;
            const insertDefaultConsumidorFinal = `INSERT INTO clientes (cli_empresa_id, cli_nacionalidad, cli_documento_identidad, cli_tipo_documento_identidad, 
                                                    cli_nombres_natural, cli_teleono, cli_direccion) VALUES (?,?,?,?,?,?,?)`

            pool.query(queryGetConsumidorFinal, [idEmp,`%${consumidorFinalName}%`], (error, results) => {
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }

                if(!results[0] | results == undefined | results == null){

                    pool.query(insertDefaultConsumidorFinal, [idEmp,'Ecuador','9999999999','CI',
                                'CONSUMIDOR FINAL','0999999999',consumidorFinalName], (error, resultado) => {
                        if(error){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: 'error insertando consumidor final'
                            });
                            return;
                        }

                        const idInserted = resultado.insertId;
                        const resultData = {
                            cli_id: idInserted,
                            cli_documento_identidad: '9999999999',
                            cli_nombres_natural: 'CONSUMIDOR FINAL',
                            cli_teleono: '0999999999'
                        }

                        resolve({
                            isSucess: true,
                            code: 200,
                            data: resultData
                        });

                    });

                }else{
                    resolve({
                        isSucess: true,
                        code: 200,
                        data: results[0]
                    });
                }

                
            });

        }catch(exception){
            console.log('error obteniendo lista de ventas');
            console.log(exception);
            reject('error obteniendo el consumidor final');
        }
    });
}


exports.getNextNumeroSecuencialByIdEmp = async(idEmp, tipoDoc, fac001, fac002) => {

    return new Promise((resolve, reject) => {
        try{
            const queryNextSecencial = `SELECT MAX(CAST(venta_numero AS UNSIGNED)) as numero FROM ventas WHERE venta_001 = ? AND venta_002 = ? AND venta_tipo = ?  
                                        AND venta_empresa_id = ?`;
            pool.query(queryNextSecencial, [fac001,fac002,tipoDoc,idEmp], function(error, results){
                if(error){
                    console.log('error consultando siguiente secuencial');
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }

                if(!results[0].numero){
                    console.log('no existe numero');
                }
                resolve({
                    isSucess: true,
                    code: 200,
                    data: results[0].numero ? Number(results[0].numero) + 1 : 1
                });

            });
        }catch(exception){
            console.log('error obteniendo siguiente secuencial');
            reject('error obteniendo siguiente secuencial');
        }
    });
}

exports.getNoPuntoVentaSecuencialByIdusuarioAndEmp = async(idEmp, tipoDoc, idUsuario) => {
    return new Promise((resolve, reject) => {
        try{

            const querySelectVenta1And2 = `SELECT CAST(venta_001 AS UNSIGNED ) AS valoruno,CAST(venta_002 AS UNSIGNED) AS valordos 
                                            FROM ventas WHERE venta_tipo = ?  AND venta_empresa_id = ? AND  venta_usu_id = ? ORDER BY venta_id DESC LIMIT 1`;
            const querySelectNextSecuencial = `SELECT MAX(CAST(venta_numero AS UNSIGNED)) AS numero FROM ventas WHERE CAST(venta_001 AS UNSIGNED) = ?
                                                AND CAST(venta_002 AS UNSIGNED) = ? AND venta_empresa_id = ?`;

            pool.query(querySelectVenta1And2, [tipoDoc,idEmp,idUsuario], function(error, results) {
                if(error){
                    console.log('error consultando punto de venta y comprobante');
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }

                if(results.length <= 0){
                    resolve({
                        isSucess: true,
                        valor001: 1,
                        valor002: 1,
                        secuencial: 1
                    });
                    return;
                }

                valor001 = results[0].valoruno;
                valor002 = results[0].valordos;

                if((valor001 != null && valor001 > 0) && (valor002 != null && valor002 > 0)){

                    pool.query(querySelectNextSecuencial, [valor001,valor002,idEmp], function(errorr, resultss) {
                        if(errorr){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: 'ocurrio un error'
                            });
                            return;
                        }

                        resolve({
                            isSucess: true,
                            valor001: valor001,
                            valor002: valor002,
                            secuencial: (resultss[0].numero + 1)
                        });
                    });

                }else{
                    resolve({
                        isSucess: true,
                        valor001: 1,
                        valor002: 1,
                        secuencial: 1
                    });
                }

            });

        }catch(exception){
            console.log('exception');
            reject('error obteniendo datos punto de venta y secuencial');
        }
    });
}


exports.getDataByIdVenta = async (idVenta, idEmp, ruc) => {
    return new Promise((resolve, reject) => {
        try{

            const queryListVentaDelleByIdVenta = `SELECT ventad_cantidad,ventad_descuento,ventad_id,ventad_iva,
            ventad_prod_id,ventad_producto,ventad_venta_id,ventad_vt,ventad_vu,prod_codigo FROM ventas_detalles, productos 
            WHERE ventad_prod_id = prod_id AND ventad_venta_id = ?`;
            const queryGetListaVentas = `SELECT venta_id as id, venta_fecha_hora AS fechaHora, venta_tipo AS documento,venta_001 AS venta001,venta_002 AS venta002, venta_numero AS numero,
                                         venta_anulado as anulado, venta_total AS total, venta_subtotal_12 AS subtotal12, venta_subtotal_0 AS subtotal0, venta_valor_iva AS valorIva,
                                         usu_username AS usuario,cli_nombres_natural AS cliente,cli_id as clienteId,cli_teleono as clienteTele,
                                         cli_direccion as clienteDir,cli_email as clienteEmail,cli_documento_identidad AS cc_ruc_pasaporte,cli_teleono AS telefono,
                                         venta_forma_pago AS forma_pago,venta_observaciones AS 'Observaciones' 
                                         FROM ventas,clientes,usuarios WHERE venta_empresa_id=? AND venta_usu_id=usu_id AND venta_cliente_id=cli_id 
                                         AND venta_id = ? `;

            pool.query(queryGetListaVentas,[idEmp, idVenta], (error, results) => {
                
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }

                if(results.length > 0){
                    pool.query(queryListVentaDelleByIdVenta,[idVenta], (errorr, resultss) => {
                    
                        if(errorr){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: 'ocurrio un error obteniendo venta detalle'
                            });
                            return;
                        }
    
                        let sendResult = results[0];
                        sendResult['data'] = resultss;

                        try{
                            //GET NUMERO AUTORIZACION
                            const dateVenta = new Date(sendResult.fechaHora);
                            const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
                            const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
                            const yearVenta = dateVenta.getFullYear().toString();
                            
                            let rucEmpresa = ruc;
                            let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(sendResult.documento);
                            let tipoAmbiente = '2';//PRODUCCION //PRUEBAS '1    '
                            let serie = `${sendResult.venta001}${sendResult.venta002}`;
                            let codigoNumerico = '12174565';
                            let secuencial = (sendResult.numero).toString().padStart(9,'0');
                            let tipoEmision = 1;
                             
                            let digit48 = 
                            `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;

                            let claveActivacion = sharedFunctions.modulo11(digit48);

                            sendResult['numeroautorizacion'] = claveActivacion;
                        }catch(exception){
                            sendResult['numeroautorizacion'] = '';
                        }

                        resolve({
                            isSucess: true,
                            code: 200,
                            data: sendResult
                        });

                        return;
                    });
                }else{
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'no existe venta con ese id empresa',
                        notExist: true
                    });
                    return;
                }

            });

        }catch(exception){
            console.log('error obteniendo lista de ventas');
            console.log(exception);
        }
    });
}


exports.getListListaVentasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileListaVentas(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc);
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


exports.getListListaResumenVentasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileResumenVentas(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc);
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

function createExcelFileListaVentas(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc){

    return new Promise((resolve, reject) => {
        try{

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombreOrCiRuc){
            
                const containsNumber =  /^[0-9]*$/.test(nombreOrCiRuc);
                valueCiRucClient = containsNumber ? nombreOrCiRuc : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombreOrCiRuc : "";

            }

            const queryGetListaVentas = `SELECT venta_id as id, venta_fecha_hora AS fechaHora, venta_tipo AS documento,CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numero,
            venta_anulado as anulado, venta_total AS total,usu_username AS usuario,cli_nombres_natural AS cliente, cli_documento_identidad AS cc_ruc_pasaporte,
            venta_forma_pago AS forma_pago,venta_observaciones AS 'Observaciones' 
            FROM ventas,clientes,usuarios WHERE venta_empresa_id=? AND venta_usu_id=usu_id AND venta_cliente_id=cli_id 
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_numero LIKE ?
            AND  venta_fecha_hora  BETWEEN ? AND ? ORDER BY venta_id DESC`;

            pool.query(queryGetListaVentas, 
                        [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc, 
                        fechaIni,fechaFin], (error, results) => {

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }
                
                const arrayData = Array.from(results);

                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Lista Ventas");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Fecha Hora', key:'fechahora', width: 20},
                    {header: 'Documento', key:'documento',width: 20},
                    {header: 'Numero', key:'numero',width: 20},
                    {header: 'Total', key:'total',width: 20},
                    {header: 'Cliente', key:'cliente',width: 50},
                    {header: 'Identificacion', key:'identificacion',width: 20},
                    {header: 'Forma de Pago', key:'formapago',width: 20}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        fechahora: valor.fechaHora,
                        documento: valor.documento,
                        numero: valor.numero,
                        total: valor.total,
                        cliente: valor.cliente,
                        identificacion: valor.cc_ruc_pasaporte,
                        formapago: valor.forma_pago
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

                    const nameFile = `/${Date.now()}_listaventas.xlsx`;
            
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

            });




        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}


function createExcelFileResumenVentas(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc){

    return new Promise((resolve, reject) => {
        try{

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombreOrCiRuc){
                const containsNumber =  /^[0-9]*$/.test(nombreOrCiRuc);
                valueCiRucClient = containsNumber ? nombreOrCiRuc : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombreOrCiRuc : "";
            }

            const queryGetListaResumenVentas = `SELECT venta_fecha_hora AS fechaHora, venta_tipo AS documento,CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numero,
            cli_nombres_natural AS cliente,cli_documento_identidad AS cc_ruc_pasaporte,venta_forma_pago AS forma_pago,venta_subtotal_12 AS subtotalIva,
            venta_subtotal_0 AS subtotalCero, venta_valor_iva AS valorIva,venta_total AS total FROM ventas,clientes,usuarios WHERE venta_empresa_id=? 
            AND venta_usu_id=usu_id AND venta_cliente_id=cli_id AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_numero LIKE ?
            AND venta_fecha_hora BETWEEN ? AND ? AND venta_anulado=0 `;

            pool.query(queryGetListaResumenVentas, 
                        [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc, 
                        fechaIni,fechaFin], (error, results) => {

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }
                
                const arrayData = Array.from(results);

                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Resumen Ventas");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Fecha Hora', key:'fechahora', width: 20},
                    {header: 'Documento', key:'documento',width: 20},
                    {header: 'Numero', key:'numero',width: 20},
                    {header: 'Total', key:'total',width: 20},
                    {header: 'Cliente', key:'cliente',width: 50},
                    {header: 'Identificacion', key:'identificacion',width: 20},
                    {header: 'Forma de Pago', key:'formapago',width: 20}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        fechahora: valor.fechaHora,
                        documento: valor.documento,
                        numero: valor.numero,
                        cliente: valor.cliente,
                        identificacion: valor.cc_ruc_pasaporte,
                        formapago: valor.forma_pago,
                        subtotal12: valor.subtotalIva,
                        subtotal0: valor.subtotalCero,
                        iva: valor.valorIva,
                        total: valor.total
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

                    const nameFile = `/${Date.now()}_resumenventas.xlsx`;
            
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

            });

        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}