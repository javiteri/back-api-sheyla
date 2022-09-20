const { query } = require('express');
const pool = require('../../../connectiondb/mysqlconnection');

exports.insertVenta = async (datosVenta) => {

    return new Promise((resolve, reject) => {
        try{

            const {empresaId,tipoVenta,venta001,venta002,ventaNumero,ventaFechaHora,
                    usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,formaPago,
                    obs} = datosVenta;
            const ventaDetallesArray = datosVenta['ventaDetalles'];
            
            //console.log(ventaDetallesArray);
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
                        arrayListVentaDetalle.forEach(ventaDetalle => {

                            const {prodId, cantidad,iva,nombreProd,
                                valorUnitario,descuento,valorTotal} = ventaDetalle;
                            
                            connection.query(sqlQueryInsertVentaDetalle, [idVentaGenerated,prodId,
                                            cantidad,iva,nombreProd,valorUnitario,
                                            descuento,valorTotal], function(errorr, results){

                                if(errorr){
                                    connection.rollback(function(){ connection.release()});
                                    reject('error insertando Venta Detalle');
                                    console.log(errorr);
                                    return;
                                }

                                //UPDATE productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ? AND
                                connection.query(sqlQueryUpdateStockProducto,[cantidad,empresaId,prodId], function(errorrr, results){
                                    if(errorrr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error descontando inventario');
                                        console.log(errorrr);
                                        return;
                                    }

                                });

                            });
                        });

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
                                message: 'Venta insertada correctamente'
                            })

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
                            
                            listVentaDetalle.forEach((ventaDetalle) => {
                                const cantidad = ventaDetalle.ventad_cantidad;
                                const prodId = ventaDetalle.ventad_prod_id;
                                
                                
                                connection.query(sqlQueryUpdateStockProducto,[cantidad,idEmpresa,prodId], function(errorrr, results){
                                    if(errorrr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error sumando inventario');
                                        return;
                                    }
                                });

                            });

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
                            listVentaDetalle.forEach((ventaDetalle) => {
                                const cantidad = ventaDetalle.ventad_cantidad;
                                const prodId = ventaDetalle.ventad_prod_id;
                                
                                connection.query(sqlQueryUpdateStockProducto,[cantidad,idEmpresa,prodId], function(errorrr, results){
                                    if(errorrr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error sumando inventario');
                                        return;
                                    }
                                   
                                });
                            });

                            connection.query(queryDeleteVentaDetalleByIdEmp, [idVenta], function (err, resultss){
                                if(err){
                                    connection.rollback(function(){ connection.release()});
                                    reject({
                                        isSucess: false,
                                        code: 400,
                                        message: erro.message
                                    });
                                    return;
                                }

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

                            });

                        });

                    }else{
                        connection.query(queryDeleteVentaDetalleByIdEmp, [idVenta], function (err, resultss){
                            if(err){
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSucess: false,
                                    code: 400,
                                    message: erro.message
                                });
                                return;
                            }

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
                                         AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_numero LIKE ?
                                         AND  venta_fecha_hora  BETWEEN ? AND ? LIMIT 1000`;
            pool.query(queryGetListaVentas, 
                [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc, 
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
            AND venta_usu_id=usu_id AND venta_cliente_id=cli_id AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_numero LIKE ?
            AND venta_fecha_hora BETWEEN ? AND ? AND venta_anulado=0 LIMIT 1000`;

            pool.query(queryGetListaResumenVentas, 
                [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc,
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
                                                    cli_nombres_natural, cli_teleono) VALUES (?,?,?,?,?,?)`

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
                                'CONSUMIDOR FINAL','0999999999'], (error, resultado) => {
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

    console.log(idEmp);
    console.log(tipoDoc);
    console.log(fac001);
    console.log(fac002);
    return new Promise((resolve, reject) => {
        try{
            const queryNextSecencial = `SELECT MAX(CAST(venta_numero AS UNSIGNED)) as numero FROM ventas WHERE venta_001 = ? AND venta_002 = ? AND venta_tipo = ?  
                                        AND venta_empresa_id = ?`;
            pool.query(queryNextSecencial, [fac001,fac002,tipoDoc,idEmp], function(error, results){
                if(error){
                    console.log('error consltando sigiente secuencial');
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