const pool = require('../../../connectiondb/mysqlconnection')
const excelJS = require("exceljs");
const fs = require('fs');
const pdfGenerator = require('../../pdf/PDFProforma');

exports.insertProforma = async (datosProforma) => {

    return new Promise((resolve, reject) => {
        try{

            const {empresaId,proformaNumero,proformaFechaHora, usuId,clienteId,subtotal12,subtotal0,valorIva,
                    ventaTotal,formaPago,obs, nombreBd} = datosProforma;
            const proformaDetallesArray = datosProforma['proformaDetalles'];
            
            // INSERT VENTA Y OBTENER ID
            // INSERTAR EN EL CAMPO UNICO CORRESPONDIENTE
            // SI SALTA QUE YA EXISTE ENTONCES ENVIAR UN MENSAJE AL CLIENTE PARA QUE SE MUESTRE
            // SI TODO ESTA CORRECTO SEGUIR CON LA INSERCION DEL DETALLE DE LA VENTA
            // INSERT VENTA DETALLE CON EL ID DE LA VENTA RECIBIDO
            // EN CADA VENTA DETALLE SE DEBE BAJAR EL STOCK DEL PRODUCTO CORRESPONDIENTE
            const sqlQueryInsertProforma = `INSERT INTO ${nombreBd}.proformas (prof_empresa_id,prof_numero,prof_fecha_hora,prof_usu_id,prof_cliente_id, 
                                        prof_subtotal_12,prof_subtotal_0,prof_valor_iva,prof_total,prof_forma_pago, 
                                        prof_observaciones, prof_unico) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
            const sqlQueryInsertProformaDetalle = `INSERT INTO ${nombreBd}.proformas_detalles (profd_prof_id,profd_prod_id,profd_cantidad, 
                                                profd_iva,profd_producto,profd_vu,profd_descuento,profd_vt) VALUES 
                                                (?,?,?,?,?,?,?,?)`
            //const sqlQueryUpdateStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ?`
                
            pool.getConnection(function(error, connection){

                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }
                    
                    connection.query(sqlQueryInsertProforma, [empresaId,proformaNumero,
                                    proformaFechaHora,usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,
                                    formaPago,obs, `${empresaId}_${proformaNumero}`], function(erro, results){
                        if(erro){
                            
                            connection.rollback(function(){ connection.release()});
                            reject({
                                isSuccess: false,
                                error: 'error insertando Proforma',
                                isDuplicate: 
                                (erro.sqlMessage.includes('Duplicate entry') || erro.sqlMessage.includes('prof_unico'))
                            });
                            return;
                        }

                        const idProformaGenerated = results.insertId;

                        const arrayListProformaDetalle = Array.from(proformaDetallesArray);
                        arrayListProformaDetalle.forEach((proformaDetalle, index) => {

                            const {prodId, cantidad,iva,nombreProd,
                                valorUnitario,descuento,valorTotal} = proformaDetalle;
                            
                            connection.query(sqlQueryInsertProformaDetalle, [idProformaGenerated,prodId,
                                            cantidad,iva,nombreProd,valorUnitario,
                                            descuento,valorTotal], function(errorr, results){

                                if(errorr){
                                    connection.rollback(function(){ connection.release()});
                                    reject('error insertando Proforma Detalle');
                                    return;
                                }

                                if(index == arrayListProformaDetalle.length - 1){
                                        
                                    connection.commit(function(errorComit){
                                        if(errorComit){
                                            connection.rollback(function(){
                                                connection.release();
                                                reject('error insertando la proforma');
                                                return;
                                            });   
                                        }
            
                                        connection.release();
                                        resolve({
                                            isSuccess: true,
                                            message: 'proforma insertada correctamente',
                                            proformaId: idProformaGenerated
                                        })
            
                                    });
                                }

                                //UPDATE productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ? AND
                                /*connection.query(sqlQueryUpdateStockProducto,[cantidad,empresaId,prodId], function(errorrr, results){
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

                                });*/

                            });
                        });

                    });

                });

            });
            
        }catch(exp){
            console.log('error insertando proforma');
            console.log(exp);
        }
    });
}

exports.getListProformasByIdEmpresa = async(idEmpresa, nombreOrCiRuc, noDoc, fechaIni, fechaFin, nombreBd) =>{
    return new Promise((resolve, reject) =>{
        try{

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombreOrCiRuc){
            
                const containsNumber =  /^[0-9]*$/.test(nombreOrCiRuc);
                valueCiRucClient = containsNumber ? nombreOrCiRuc : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombreOrCiRuc : "";

            }

            const queryGetListaVentas = `SELECT prof_id as id, prof_fecha_hora AS fechaHora, prof_numero,
                                         prof_anulado , prof_total AS total,usu_username AS usuario,cli_nombres_natural AS cliente, cli_documento_identidad AS cc_ruc_pasaporte,
                                         prof_forma_pago AS forma_pago,prof_observaciones AS Observaciones
                                         FROM ${nombreBd}.proformas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE prof_empresa_id=? AND prof_usu_id=usu_id AND prof_cliente_id=cli_id 
                                         AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
                                         prof_numero LIKE ?
                                         AND  prof_fecha_hora  BETWEEN ? AND ?
                                         ORDER BY prof_id DESC`;

            pool.query(queryGetListaVentas, [idEmpresa, "%"+valueNombreClient+"%", 
                                            "%"+valueCiRucClient+"%", "%"+noDoc+"%", fechaIni,fechaFin], (err, results) => {

                if(err){
                    console.log(err);
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

        }catch(exception){
            reject({
                isSucess: false,
                mensaje: 'error al obtener la lista de proformas, reintente'
            });
        }
    });
}

exports.getNoProformaSecuencialByIdusuarioAndEmp = async(idEmp, idUsuario, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            
            const querySelectNoProforma = `SELECT MAX(CAST(prof_numero as UNSIGNED)) AS numero FROM ${nombreBd}.proformas WHERE prof_empresa_id = ?`;

            pool.query(querySelectNoProforma, [idEmp], function(error, results) {
                if(error){
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
                        numeroProf: 1,
                    });
                    return;
                }

                let numeroProforma = results[0].numero;

                if(numeroProforma != null && numeroProforma > 0){
                    resolve({
                        isSucess: true,
                        numeroProf: numeroProforma + 1,
                    });
                }else{
                    resolve({
                        isSucess: true,
                        numeroProf: 1,
                    });
                }

            });

        }catch(exception){
            console.log('exception');
            reject('error obteniendo datos secuencial proforma');
        }
    });
}

exports.deleteProformaEstadoAnuladoByIdEmpresa = async (datos) => {
    return new Promise((resolve, reject) => {

        try{

            const {idEmpresa,idProforma,nombreBd} = datos;

            //const sqlSelectDetalleVenta = `SELECT * FROM ${nombreBd}.ventas_detalles WHERE ventad_venta_id = ?`;
            //const sqlQueryUpdateStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`;
            const queryDeleteProformaByIdEmp = `DELETE FROM ${nombreBd}.proformas WHERE prof_id = ? AND prof_empresa_id = ? LIMIT 1`;
            //const queryDeleteVentaDetalleByIdEmp = `DELETE FROM ${nombreBd}.ventas_detalles WHERE ventad_venta_id = ?`;

            pool.getConnection(function(error, connection){
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }

                    connection.query(queryDeleteProformaByIdEmp, [idProforma, idEmpresa], function (errores, resultsss){
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
                                    reject('error eliminando proforma');
                                    return;
                                });   
                            }
                            connection.release();
                            resolve({
                                isSuccess: true,
                                message: 'proforma eliminada correctamente'
                            })
                        });

                    });

                    /*if(estado == 0){

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
                        connection.query(queryDeleteProformaByIdEmp, [idProforma, idEmpresa], function (errores, resultsss){
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
                    }*/
                });
            });

        }catch(exception){
            console.log('error eliminando proforma');
            console.log(exception);
        }
    });
}

exports.getListListaProformasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileListaProformas(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd);
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

function createExcelFileListaProformas(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd){

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

            const queryGetListaVentas = `SELECT prof_id as id, prof_fecha_hora AS fechaHora, prof_numero,
                                         prof_anulado , prof_total AS total,usu_username AS usuario,cli_nombres_natural AS cliente, cli_documento_identidad AS cc_ruc_pasaporte,
                                         prof_forma_pago AS forma_pago,prof_observaciones AS Observaciones
                                         FROM ${nombreBd}.proformas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE prof_empresa_id=? AND prof_usu_id=usu_id AND prof_cliente_id=cli_id 
                                         AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
                                         prof_numero LIKE ?
                                         AND  prof_fecha_hora  BETWEEN ? AND ?
                                         ORDER BY prof_id DESC`;

            pool.query(queryGetListaVentas, [idEmp, "%"+valueNombreClient+"%", 
                                         "%"+valueCiRucClient+"%", "%"+noDoc+"%", fechaIni,fechaFin], (error, results) => {
                
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
                const worksheet = workBook.addWorksheet("Lista Proformas");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Fecha Hora', key:'fechahora', width: 20},
                    {header: 'Numero', key:'numero',width: 20},
                    {header: 'Total', key:'total',width: 20},
                    {header: 'Cliente', key:'cliente',width: 50},
                    {header: 'Identificacion', key:'identificacion',width: 20},
                    {header: 'Forma de Pago', key:'formapago',width: 20}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        fechahora: valor.fechaHora,
                        numero: valor.prof_numero,
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

                    const nameFile = `/${Date.now()}_listaproformas.xlsx`;
            
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

            });


        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}


exports.generateDownloadPdfFromProforma = (idEmp, idProforma, identificacionCliente, isPdfNormal, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        //const querySelectConfigFactElectr = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
        const sqlQuerySelectEmp = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ? LIMIT 1`;
        const sqlQuerySelectClienteByIdEmp = `SELECT * FROM ${nombreBd}.clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectProformaByIdEmp = `SELECT proformas.*, usu_nombres FROM ${nombreBd}.proformas, ${nombreBd}.usuarios WHERE prof_usu_id = usu_id AND prof_id = ? AND prof_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectProformaDetallesByIdProforma = `SELECT proformas_detalles.*, prod_codigo FROM ${nombreBd}.proformas_detalles, ${nombreBd}.productos WHERE 
                                                            profd_prod_id = prod_id AND profd_prof_id = ? `;
        //const sqlQuerySelectDatosEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_establecimiento = ? LIMIT 1`;

        try{
            //const responseDatosConfig = await pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%']);
            const responseDatosEmpresa = await pool.query(sqlQuerySelectEmp,[idEmp]);
            const responseDatosCliente = await pool.query(sqlQuerySelectClienteByIdEmp, [identificacionCliente, idEmp]);
            const responseDatosProforma = await pool.query(sqlQuerySelectProformaByIdEmp, [idProforma, idEmp]);
            const responseDatosProformaDetalles = await pool.query(sqlQuerySelectProformaDetallesByIdProforma, [idProforma]);
           // const responseDatosEstablecimiento = await pool.query(sqlQuerySelectDatosEstablecimiento, [idEmp, responseDatosProforma[0].venta_001]);

            // GENERATE PDF WHIT DATA                            
            responseDatosProforma['listProformasDetalles'] = responseDatosProformaDetalles;
            
            const pathPdfGenerated = pdfGenerator.generatePdfFromProforma(responseDatosEmpresa,responseDatosCliente, responseDatosProforma);

            pathPdfGenerated.then(
                function(result){
                    resolve({
                        isSucess: true,
                        message: 'todo Ok',
                        generatePath: result.pathFile
                    });
                },
                function(error){
                    reject({
                        isSucess: false,
                        message:  error.message
                    });
                }
            );

        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                message: 'Ocurrio un error generando el PDF'
            });
        }

    });
};