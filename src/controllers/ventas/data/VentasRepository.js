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
                        console.log('insertVentaId: ' + idVentaGenerated);

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