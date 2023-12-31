const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');
const sharedFunctions = require('../../../util/sharedfunctions');

exports.insertVenta = async (datosVenta) => {

    return new Promise(async (resolve, reject) => {

        let conexion = await pool.getConnection();
        try{

            const {empresaId,tipoVenta,venta001,venta002,ventaNumero,ventaFechaHora,
                    usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,formaPago,obs, nombreBd} = datosVenta;
            const ventaDetallesArray = datosVenta['ventaDetalles'];
            
            // INSERT VENTA Y OBTENER ID
            // INSERTAR EN EL CAMPO UNICO CORRESPONDIENTE
            // SI SALTA QUE YA EXISTE ENTONCES ENVIAR UN MENSAJE AL CLIENTE PARA QUE SE MUESTRE
            // SI TODO ESTA CORRECTO SEGUIR CON LA INSERCION DEL DETALLE DE LA VENTA
            // INSERT VENTA DETALLE CON EL ID DE LA VENTA RECIBIDO
            // EN CADA VENTA DETALLE SE DEBE BAJAR EL STOCK DEL PRODUCTO CORRESPONDIENTE
            const sqlQueryInsertVenta = `INSERT INTO ${nombreBd}.ventas (venta_empresa_id,venta_tipo, 
                                        venta_001,venta_002,venta_numero,venta_fecha_hora,venta_usu_id,venta_cliente_id, 
                                        venta_subtotal_12,venta_subtotal_0,venta_valor_iva,venta_total,venta_forma_pago, 
                                        venta_observaciones, venta_unico) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            const sqlQueryInsertVentaDetalle = `INSERT INTO ${nombreBd}.ventas_detalles (ventad_venta_id,ventad_prod_id,ventad_cantidad, 
                                                ventad_iva,ventad_producto,ventad_vu,ventad_descuento,ventad_vt) VALUES 
                                                (?,?,?,?,?,?,?,?)`;
            const sqlQueryUpdateStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ?`;
            
            
            await conexion.beginTransaction();
            
            let results = await conexion.query(sqlQueryInsertVenta, [empresaId,tipoVenta,venta001,venta002,ventaNumero,
                                ventaFechaHora,usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,
                                formaPago,obs, `${empresaId}_${tipoVenta}_${venta001}_${venta002}_${ventaNumero}`]);

            const idVentaGenerated = results[0].insertId;

            const arrayListVentaDetalle = Array.from(ventaDetallesArray);
            for(let index = 0; index < arrayListVentaDetalle.length; index++){

                let ventaDetalle = arrayListVentaDetalle[index];
                const {prodId, cantidad,iva,nombreProd,
                    valorUnitario,descuento,valorTotal} = ventaDetalle;
                    
                await conexion.query(sqlQueryInsertVentaDetalle, [idVentaGenerated,prodId,
                                    cantidad,iva,nombreProd,valorUnitario,
                                    descuento,valorTotal]);
                
                //UPDATE productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ? AND
                await conexion.query(sqlQueryUpdateStockProducto,[cantidad,empresaId,prodId]); 

                if(index == arrayListVentaDetalle.length - 1){
                    await conexion.commit();
                    conexion.release();

                    resolve({
                        isSuccess: true,
                        message: 'Venta insertada correctamente',
                        ventaid: idVentaGenerated
                    })
                }
            }
            
        }catch(exp){
            await conexion.rollback();
            conexion.release();

            reject({
                isSuccess: false,
                error: 'error insertando Venta',
                isDuplicate: 
                (exp.sqlMessage.includes('Duplicate entry') || exp.sqlMessage.includes('venta_unico'))
            });
        }
    });
}

exports.updateEstadoAnuladoVentaByIdEmpresa = async (datos) => {
    return new Promise(async (resolve, reject) => {

        let conexion = await pool.getConnection();
        try{
            const {idEmpresa,idVenta,estado, nombreBd} = datos;
            const sqlSelectDetalleVenta = `SELECT * FROM ${nombreBd}.ventas_detalles WHERE ventad_venta_id = ?`;
            const sqlUpdateEstadoVenta = `UPDATE ${nombreBd}.ventas SET venta_anulado = ? WHERE venta_id = ? AND venta_empresa_id = ?`;
            const sqlQueryUpdateStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`;

            await conexion.beginTransaction();
            await conexion.query(sqlUpdateEstadoVenta, [estado,idVenta,idEmpresa]);
            let results = await conexion.query(sqlSelectDetalleVenta, [idVenta]);

            const listVentaDetalle = Array.from(results[0]);
            for(let index = 0; index < listVentaDetalle.length; index++){

                let ventaDetalle = listVentaDetalle[index];
                let cantidad = ventaDetalle.ventad_cantidad;
                let prodId = ventaDetalle.ventad_prod_id;
                                
                await conexion.query(sqlQueryUpdateStockProducto,[cantidad,idEmpresa,prodId]);

                if(index == listVentaDetalle.length - 1){
                    await conexion.commit();
                    conexion.release();

                    resolve({
                        isSuccess: true,
                        message: 'Venta anulada correctamente'
                    })
                }
            }

        }catch(exp){
            await conexion.rollback();
            conexion.release();
            reject({
                isSucess: false,
                code: 400,
                message: 'error actualizando update estado venta'
            });
        }
    });
}

exports.deleteVentaEstadoAnuladoByIdEmpresa = async (datos) => {
    return new Promise(async (resolve, reject) => {

        let conexion = await pool.getConnection();
        try{

            const {idEmpresa,idVenta,estado, nombreBd} = datos;

            const sqlSelectDetalleVenta = `SELECT * FROM ${nombreBd}.ventas_detalles WHERE ventad_venta_id = ?`;
            const sqlQueryUpdateStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`;
            const queryDeleteVentaByIdEmp = `DELETE FROM ${nombreBd}.ventas WHERE venta_id = ? AND venta_empresa_id = ? LIMIT 1`;
            const queryDeleteVentaDetalleByIdEmp = `DELETE FROM ${nombreBd}.ventas_detalles WHERE ventad_venta_id = ?`;

            await conexion.beginTransaction();

            if(estado == 0){
                let results = await conexion.query(sqlSelectDetalleVenta, [idVenta]);

                const listVentaDetalle = Array.from(results[0]);

                if(listVentaDetalle.length == 0){
                    await conexion.query(queryDeleteVentaByIdEmp, [idVenta,idEmpresa]);

                    await conexion.commit();
                    conexion.release();

                    resolve({
                            isSuccess: true,
                            message: 'Venta eliminada correctamente'
                    })

                }else{
                    for(let index = 0; index < listVentaDetalle.length; index++){
                        
                        let ventaDetalle = listVentaDetalle[index];

                        const cantidad = ventaDetalle.ventad_cantidad;
                        const prodId = ventaDetalle.ventad_prod_id;
                                    
                        await conexion.query(sqlQueryUpdateStockProducto,[cantidad,idEmpresa,prodId]);

                        if(index == listVentaDetalle.length - 1){
                            
                            await conexion.query(queryDeleteVentaByIdEmp, [idVenta,idEmpresa]);

                            await conexion.commit();
                            conexion.release();

                            resolve({
                                isSuccess: true,
                                message: 'Venta eliminada correctamente'
                            })

                        }
                    } 
                }
            }else{
                await conexion.query(queryDeleteVentaByIdEmp, [idVenta, idEmpresa]);
                await conexion.commit();
                conexion.release();

                resolve({
                    isSuccess: true,
                    message: 'Venta eliminada correctamente'
                })
            }

        }catch(exception){
            await conexion.rollback();
            conexion.release();

            reject({
                isSucess: false,
                code: 400,
                message: 'error eliminando venta'
            });
        }
    });
}

exports.getListVentasByIdEmpresa = async (idEmp, nombreOrCiRuc, noDoc, fechaIni, fechaFin, nombreBd) => {
    return new Promise(async (resolve, reject) => {
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
                                         FROM ${nombreBd}.ventas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE venta_empresa_id=? AND venta_usu_id=usu_id AND venta_cliente_id=cli_id 
                                         AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
                                         CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ?
                                         AND  venta_fecha_hora  BETWEEN ? AND ? ORDER BY venta_id DESC`;

            let results = await pool.query(queryGetListaVentas, 
                                            [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc+"%", 
                                              fechaIni+" 00:00:00",fechaFin+" 23:59:59"]);
            
            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
            });

        }catch(exception){
            
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo lista de ventas'
            });
        }
    });
}

exports.getListResumenVentasByIdEmpresa = async (idEmp, nombreOrCiRuc, noDoc, fechaIni, fechaFin, nombreBd) => {
    return new Promise(async (resolve, reject) => {
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
            venta_subtotal_0 AS subtotalCero, venta_valor_iva AS valorIva,venta_total AS total 
            FROM ${nombreBd}.ventas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE venta_empresa_id=? 
            AND venta_usu_id=usu_id AND venta_cliente_id=cli_id AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ?
            AND venta_fecha_hora BETWEEN ? AND ? AND venta_anulado=0 `;

            let results = await pool.query(queryGetListaResumenVentas, 
                [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc+"%",
                fechaIni+" 00:00:00",fechaFin+" 23:59:59"]); 

            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
            });

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo lista resumen ventas'
            });
        }
    });
};


exports.getOrCreateConsFinalByIdEmp = async (idEmp, nombreBd) => {
    return new Promise(async(resolve, reject) => {
        try{
            const consumidorFinalName = 'CONSUMIDOR FINAL';
            const queryGetConsumidorFinal = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_nombres_natural LIKE ? LIMIT 1`;
            const insertDefaultConsumidorFinal = `INSERT INTO ${nombreBd}.clientes (cli_empresa_id, cli_nacionalidad, cli_documento_identidad, cli_tipo_documento_identidad, 
                                                    cli_nombres_natural, cli_teleono, cli_direccion) VALUES (?,?,?,?,?,?,?)`;

            const responseConsumidorFinal = await pool.query(queryGetConsumidorFinal, [idEmp,`%${consumidorFinalName}%`]);
            
            if(responseConsumidorFinal[0].length == 0){
                const respInsertDefaultConsumidorFinal = await pool.query(insertDefaultConsumidorFinal, [idEmp,'Ecuador','9999999999','CI',
                                                                            'CONSUMIDOR FINAL','0999999999',consumidorFinalName] );

                const idInserted = respInsertDefaultConsumidorFinal[0].insertId;
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

            }else{
                resolve({
                    isSucess: true,
                    code: 200,
                    data: responseConsumidorFinal[0][0]
                });
            }

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo el consumidor final'
            });
        }
    });
}


exports.getNextNumeroSecuencialByIdEmp = async(idEmp, tipoDoc, fac001, fac002,nombreBd) => {

    return new Promise(async(resolve, reject) => {
        try{
            const queryNextSecencial = `SELECT MAX(CAST(venta_numero AS UNSIGNED)) as numero FROM ${nombreBd}.ventas WHERE venta_001 = ? AND venta_002 = ? AND venta_tipo = ?  
                                        AND venta_empresa_id = ?`;
            const responseSecuencial = await pool.query(queryNextSecencial, [fac001,fac002,tipoDoc,idEmp]);
            
            resolve({
                isSucess: true,
                code: 200,
                data: responseSecuencial[0][0].numero ? Number(responseSecuencial[0][0].numero) + 1 : 1
            });

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo siguiente secuencial'
            });
        }
    });
}

exports.getNoPuntoVentaSecuencialByIdusuarioAndEmp = async(idEmp, tipoDoc, idUsuario, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{

            const querySelectVenta1And2 = `SELECT CAST(venta_001 AS UNSIGNED ) AS valoruno,CAST(venta_002 AS UNSIGNED) AS valordos 
                                            FROM ${nombreBd}.ventas WHERE venta_tipo = ?  AND venta_empresa_id = ? AND  venta_usu_id = ? ORDER BY venta_id DESC LIMIT 1`;
            const querySelectNextSecuencial = `SELECT MAX(CAST(venta_numero AS UNSIGNED)) AS numero FROM ${nombreBd}.ventas WHERE CAST(venta_001 AS UNSIGNED) = ?
                                                AND CAST(venta_002 AS UNSIGNED) = ? AND venta_empresa_id = ?`;

            const respSelectVenta = await pool.query(querySelectVenta1And2, [tipoDoc,idEmp,idUsuario]);

            if(respSelectVenta[0].length <= 0){
                resolve({
                    isSucess: true,
                    valor001: 1,
                    valor002: 1,
                    secuencial: 1
                });
                return;
            }

            valor001 = respSelectVenta[0][0].valoruno;
            valor002 = respSelectVenta[0][0].valordos;

            if((valor001 != null && valor001 > 0) && (valor002 != null && valor002 > 0)){
                const respNextSecuencial = await pool.query(querySelectNextSecuencial, [valor001,valor002,idEmp]);

                resolve({
                    isSucess: true,
                    valor001: valor001,
                    valor002: valor002,
                    secuencial: (respNextSecuencial[0][0].numero + 1)
                });

            }else{
                resolve({
                    isSucess: true,
                    valor001: 1,
                    valor002: 1,
                    secuencial: 1
                });
            }

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo datos punto de venta y secuencial'
            });
        }
    });
}


exports.getDataByIdVenta = async (idVenta, idEmp, ruc, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{

            const queryListVentaDelleByIdVenta = `SELECT ventad_cantidad,ventad_descuento,ventad_id,ventad_iva,
                                                    ventad_prod_id,ventad_producto,ventad_venta_id,ventad_vt,ventad_vu,prod_codigo 
                                                    FROM ${nombreBd}.ventas_detalles, ${nombreBd}.productos 
                                                    WHERE ventad_prod_id = prod_id AND ventad_venta_id = ?`;
            const queryGetListaVentas = `SELECT venta_id as id, venta_fecha_hora AS fechaHora, venta_tipo AS documento,venta_001 AS venta001,venta_002 AS venta002, venta_numero AS numero,
                                         venta_anulado as anulado, venta_total AS total, venta_subtotal_12 AS subtotal12, venta_subtotal_0 AS subtotal0, venta_valor_iva AS valorIva,
                                         usu_username AS usuario,cli_nombres_natural AS cliente,cli_id as clienteId,cli_teleono as clienteTele,
                                         cli_direccion as clienteDir,cli_email as clienteEmail,cli_documento_identidad AS cc_ruc_pasaporte,cli_teleono AS telefono,
                                         venta_forma_pago AS forma_pago,venta_observaciones AS 'Observaciones' 
                                         FROM ${nombreBd}.ventas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE venta_empresa_id=? AND venta_usu_id=usu_id AND venta_cliente_id=cli_id 
                                         AND venta_id = ? `;

            let results = await pool.query(queryGetListaVentas,[idEmp, idVenta]); 
            
            if(results[0].length > 0){
                let resultss = await pool.query(queryListVentaDelleByIdVenta,[idVenta]);
                
                let sendResult = results[0][0];
                sendResult['data'] = resultss[0];

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

            }else{
                reject({
                    isSucess: false,
                    code: 400,
                    messageError: 'no existe venta con ese id empresa',
                    notExist: true
                });
            }

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo lista de ventas'
            });
        }
    });
}


exports.importListVentas = async (listVentas, nombreBd, idEmpresa) => {
    return new Promise(async (resolve, reject ) => {

        
            let listVentasWithError = [];
        
            // INSERT VENTA Y OBTENER ID
            // INSERTAR EN EL CAMPO UNICO CORRESPONDIENTE
            // SI SALTA QUE YA EXISTE ENTONCES ENVIAR UN MENSAJE AL CLIENTE PARA QUE SE MUESTRE
            // SI TODO ESTA CORRECTO SEGUIR CON LA INSERCION DEL DETALLE DE LA VENTA
            // INSERT VENTA DETALLE CON EL ID DE LA VENTA RECIBIDO
            // EN CADA VENTA DETALLE SE DEBE BAJAR EL STOCK DEL PRODUCTO CORRESPONDIENTE
            const sqlQueryExistClient = `SELECT cli_id AS ID FROM ${nombreBd}.clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
            const sqlQueryExistProduct = `SELECT * FROM ${nombreBd}.productos WHERE prod_codigo = ? AND prod_empresa_id = ? LIMIT 1`;

            const sqlQueryInsertVenta = `INSERT INTO ${nombreBd}.ventas (venta_empresa_id,venta_tipo, 
                                        venta_001,venta_002,venta_numero,venta_fecha_hora,venta_usu_id,venta_cliente_id, 
                                        venta_subtotal_12,venta_subtotal_0,venta_valor_iva,venta_total,venta_forma_pago, 
                                        venta_observaciones, venta_unico) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            const sqlQueryInsertVentaDetalle = `INSERT INTO ${nombreBd}.ventas_detalles (ventad_venta_id,ventad_prod_id,ventad_cantidad, 
                                                ventad_iva,ventad_producto,ventad_vu,ventad_descuento,ventad_vt) VALUES 
                                                (?,?,?,?,?,?,?,?)`;

            const queryInsertCliente = `INSERT INTO ${nombreBd}.clientes (cli_empresa_id, cli_nacionalidad, cli_documento_identidad, cli_tipo_documento_identidad, 
                                                cli_nombres_natural, cli_razon_social , cli_observacion , cli_fecha_nacimiento) VALUES (?,?,?,?,?,?,?,?)`;

            let conexion = await pool.getConnection();
            
            for(let index = 0; index < listVentas.length; index++){

                let datosVenta = listVentas[index];

                try{
                    await conexion.beginTransaction();

                    let cliente = await conexion.query(sqlQueryExistClient, [datosVenta.cc_ruc_pasaporte, idEmpresa]);

                    let idCliente = 0;
                    if(cliente[0].length > 0){
                        idCliente = cliente[0][0].ID;
                    }else{
                        let resultCliente = await conexion.query(queryInsertCliente, [idEmpresa, 'ECUADOR', datosVenta.cc_ruc_pasaporte, 'CI', 
                                                                    datosVenta.cliente, '', '', '2023-01-18']);
                        idCliente = resultCliente[0].insertId;
                    }

                    //INSERT VENTA
                    let arrayNumVenta = datosVenta.numero.split('-');
                    let ventaUnico = `${idEmpresa}_${datosVenta.documento}_${arrayNumVenta[0]}_${arrayNumVenta[1]}_${arrayNumVenta[2]}`;

                    let resultVenta = await conexion.query(sqlQueryInsertVenta, [idEmpresa, datosVenta.documento, arrayNumVenta[0],
                                        arrayNumVenta[1], arrayNumVenta[2], datosVenta.fechaHora, datosVenta.idUsuario, idCliente,
                                        datosVenta.subtotalIva, datosVenta.subtotalCero, datosVenta.valorIva, datosVenta.total, datosVenta.forma_pago,
                                        '', ventaUnico]);

                    let idVenta = resultVenta[0].insertId;
                    let listVentaDetalle = datosVenta.listDetalle;

                    for(const ventaDetalle of listVentaDetalle){
                        //VERIFICAR SI EXISTE EL PRODUCTO 
                        let resultProducto = await conexion.query(sqlQueryExistProduct, [ventaDetalle.codigoproducto, idEmpresa]);
                        if(resultProducto[0].length <= 0){
                            throw new Error('El producto no existe');
                        }

                        
                        let idProducto = resultProducto[0][0].prod_id;
                        let nombreProducto = resultProducto[0][0].prod_nombre;
 
                        //INSERTAR DETALLE DE LA VENTA
                        await conexion.query(sqlQueryInsertVentaDetalle, [idVenta,idProducto, ventaDetalle.cantidad,
                                                ventaDetalle.iva,nombreProducto,ventaDetalle.valorUnitario, '', 
                                                ventaDetalle.totalDetalle]);

                    }
                    
                    await conexion.commit();

                    if(listVentas.length - 1 == index){
                        conexion.release();
                        resolve({
                            isSucess: true,
                            message: 'Ventas Insertadas Correctamente',
                            listVentasWithError: listVentasWithError
                        });
                    }

                }catch(exception){
                    await conexion.rollback();
                    conexion.release();

                    let ventaResponse = datosVenta;
                    ventaResponse.messageError =  'error insertando venta';
                    ventaResponse.venta_error_server = true;
                    listVentasWithError.push(ventaResponse);

                    if(listVentas.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'Ventas Insertadas Correctamente',
                            listVentasWithError: listVentasWithError
                        });
                    }
                }
            }        
    });
}



exports.getListListaVentasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileListaVentas(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd);
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


exports.getListListaResumenVentasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc,nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileResumenVentas(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc,nombreBd);
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

function createExcelFileListaVentas(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd){

    return new Promise(async (resolve, reject) => {
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
            FROM ${nombreBd}.ventas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE venta_empresa_id=? AND venta_usu_id=usu_id AND venta_cliente_id=cli_id 
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_numero LIKE ?
            AND  venta_fecha_hora  BETWEEN ? AND ? ORDER BY venta_id DESC`;

            let results = await pool.query(queryGetListaVentas, 
                        [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc, 
                        fechaIni,fechaFin]);
                
            const arrayData = Array.from(results[0]);

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


function createExcelFileResumenVentas(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc,nombreBd){

    return new Promise(async (resolve, reject) => {
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
            venta_subtotal_0 AS subtotalCero, venta_valor_iva AS valorIva,venta_total AS total 
            FROM ${nombreBd}.ventas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE venta_empresa_id=? 
            AND venta_usu_id=usu_id AND venta_cliente_id=cli_id AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_numero LIKE ?
            AND venta_fecha_hora BETWEEN ? AND ? AND venta_anulado=0 `;

            let results = await pool.query(queryGetListaResumenVentas, 
                        [idEmp, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc, 
                        fechaIni,fechaFin]); 
                        
            const arrayData = Array.from(results[0]);

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


exports.getTemplateVentasExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createTemplateVentasExcel(idEmpresa, nombreBd);
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

function createTemplateVentasExcel(idEmp, nombreBd){

    return new Promise((resolve, reject) => {
        try{

            const workBook = new excelJS.Workbook(); // Create a new workbook
            const worksheet = workBook.addWorksheet("Lista Ventas");
            const path = `./files/${idEmp}`;

            worksheet.columns = [
                {header: 'identificacion', key:'identificacion', width: 50},
                {header: 'nombre', key:'nombre',width: 50},
                {header: 'fecha', key:'pvp',width: 20},
                {header: 'numeroventa', key:'numeroventa',width: 20},
                {header: 'formapago', key:'formapago',width: 40},
                {header: 'tipo_documento', key:'tipo_documento',width: 40},
                {header: 'subtotal0', key:'subtotal0',width: 20},
                {header: 'subtotal12', key:'subtotal12',width: 30},
                {header: 'valortotal', key:'valortotal',width: 30},
                {header: 'codigoproducto', key:'codigoproducto',width: 30},
                {header: 'cantidad', key:'cantidad',width: 30},
                {header: 'totaldetalle', key:'totaldetalle',width: 30},
                {header: 'iva', key:'iva',width: 20}
            ];

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

                const nameFile = `/${Date.now()}_ventas_template.xlsx`;
        
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
                reject({
                    isSucess: false,
                    error: 'error creando archivo, reintente'
                });
            }
        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo plantilla, reintente'
            });
        }
    });

}
