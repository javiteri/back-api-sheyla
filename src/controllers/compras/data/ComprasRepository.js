const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');
const soapRequest = require('easy-soap-request');
const pdfGenerator = require('../../pdf/PDFGenerator');

exports.verifyListProductXml = async (idEmpresa, listProductosXml, nombreBd) => {
    return new Promise((resolve, reject) => {

        const sqlQueryExistProduct = `SELECT * FROM ${nombreBd}.PRODUCTOS WHERE prod_empresa_id = ? AND (prod_codigo_xml = ? || prod_codigo = ?) LIMIT 1 `;

        let resultProductsExist = [];

        listProductosXml.forEach((elemento, index) => {

            pool.query(sqlQueryExistProduct, [idEmpresa, elemento.codigoPrincipal, elemento.codigoPrincipal], function(erro, results){
                if(erro){
                    resultProductsExist.push({
                        codigoXml: elemento,
                        exist: false
                    });

                    return;
                }

                let elementTmp = elemento;
                if(!(!results | results == undefined | results == null | !results.length)){
                    
                    elementTmp['codigoXml'] = elemento.codigoPrincipal;
                    elementTmp['exist'] = true;
                    elementTmp['codigoInterno'] =  results[0].prod_codigo;
                    elementTmp['descripcionInterna'] = results[0].prod_nombre;

                    resultProductsExist.push(elementTmp);

                }else{
                    elementTmp['codigoXml'] = elemento.codigoPrincipal;
                    elementTmp['exist'] = (!results | results == undefined | results == null | !results.length) ? false : true;

                    resultProductsExist.push(elementTmp);
                }

                if(resultProductsExist.length == listProductosXml.length){
                    resolve({
                        isSuccess: true,
                        mensaje: 'ok',
                        listProductosXml: resultProductsExist
                    });
                }
            });
        });
        
    });
}

exports.insertCompra = async (datosCompra) => {

    return new Promise((resolve, reject) => {
        try{

            const {empresaId,tipoCompra,compraNumero,compraFechaHora,
                    usuId,proveedorId,subtotal12,subtotal0,valorIva,compraTotal,formaPago,
                    obs, sriSustento,compraAutorizacionSri,compraNcId, nombreBd} = datosCompra;
            const compraDetallesArray = datosCompra['compraDetalles'];
            
            let isPlusInventario;
            if(tipoCompra.includes('04 Nota de crédito') || tipoCompra.includes('66 Nota de Crédito NO DEDUCIBLE')
            || tipoCompra.includes('47 N/C por Reembolso Emitida por Intermediario') ){
                isPlusInventario = false;
            }else{
                isPlusInventario = true;
            }

            // INSERT VENTA Y OBTENER ID
                // INSERTAR EN EL CAMPO UNICO CORRESPONDIENTE
                // SI SALTA QUE YA EXISTE ENTONCES ENVIAR UN MENSAJE AL CLIENTE PARA QUE SE MUESTRE
                // SI TODO ESTA CORRECTO SEGUIR CON LA INSERCION DEL DETALLE DE LA VENTA
            // INSERT VENTA DETALLE CON EL ID DE LA VENTA RECIBIDO
            // EN CADA VENTA DETALLE SE DEBE BAJAR EL STOCK DEL PRODUCTO CORRESPONDIENTE
            const sqlQueryExistCompra = `SELECT * FROM ${nombreBd}.compras WHERE compra_empresa_id = ? AND compra_tipo = ? 
                                        AND compra_proveedor_id = ? AND compra_numero = ? `;
            const sqlQueryInsertCompra = `INSERT INTO ${nombreBd}.compras (
                compra_empresa_id,compra_tipo,compra_numero,compra_fecha_hora,compra_usu_id,compra_proveedor_id,
                compra_subtotal_12,compra_subtotal_0,compra_valor_iva,compra_total,compra_forma_pago,compra_observaciones,
                compra_sri_sustento,compra_autorizacion_sri,compra_nc_nd_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
            const sqlQueryInsertCompraDetalle = `INSERT INTO ${nombreBd}.compras_detalles (comprad_compra_id,comprad_pro_id,comprad_cantidad, 
                comprad_iva,comprad_producto,comprad_vu,comprad_descuento,comprad_vt) VALUES (?,?,?,?,?,?,?,?)`

            const sqlQueryUpdatePlusStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`
            const sqlQueryUpdateMinusStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ?`
            
            pool.getConnection(function(error, connection){

                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }
                    
                    connection.query(sqlQueryExistCompra, [empresaId,tipoCompra,proveedorId,compraNumero], function(erorr, result){
                        if(erorr){
                            connection.rollback(function(){ connection.release()});
                            reject({
                                isSuccess: false,
                                error: 'error insertando Compra'
                            });
                            return;
                        }

                        if(result.length > 0 | result){
                            connection.rollback(function(){ connection.release()});
                            reject({
                                isSuccess: false,
                                error: 'ya existe documento con ese numero',
                                isDuplicate: true
                            });
                            return;
                        }

                        const compraNcNdId = (compraNcId == 0 ? null : compraNcId);
                        connection.query(sqlQueryInsertCompra, [empresaId,tipoCompra,compraNumero,
                            compraFechaHora,usuId,proveedorId,subtotal12,subtotal0,valorIva,compraTotal,
                                        formaPago,obs, sriSustento,compraAutorizacionSri,compraNcNdId], function(erro, results){
    
                            if(erro){
                                connection.rollback(function(){ connection.release()});
                                reject({
                                    isSuccess: false,
                                    error: 'error insertando Compra'
                                });
                                return;
                            }
    
                            const idVentaGenerated = results.insertId;
    
                            const arrayListCompraDetalle = Array.from(compraDetallesArray);
                            arrayListCompraDetalle.forEach((compraDetalle, index) => {
    
                                const {prodId, cantidad,iva,nombreProd,
                                    valorUnitario,descuento,valorTotal} = compraDetalle;
                                
                                connection.query(sqlQueryInsertCompraDetalle, [idVentaGenerated,prodId,
                                                cantidad,iva,nombreProd,valorUnitario,
                                                descuento,valorTotal], function(errorr, results){
    
                                    if(errorr){
                                        connection.rollback(function(){ connection.release()});
                                        reject('error insertando Compra Detalle');
                                        return;
                                    }
                                    

                                    connection.query(
                                        isPlusInventario? sqlQueryUpdatePlusStockProducto : sqlQueryUpdateMinusStockProducto,
                                        [cantidad,empresaId,prodId], function(errorrr, results){ 

                                        if(errorrr){
                                            connection.rollback(function(){ connection.release()});
                                            reject('error operando inventario');
                                            console.log(errorrr);
                                            return;
                                        }
                                        
                                        if(index == arrayListCompraDetalle.length - 1){
                                            connection.commit(function(errorComit){
                                                if(errorComit){
                                                    connection.rollback(function(){
                                                        connection.release();
                                                        reject('error insertando la Compra');
                                                        return;
                                                    });   
                                                }
                                                
                                                connection.release();
                                                resolve({
                                                    isSuccess: true,
                                                    message: 'Compra insertada correctamente'
                                                })
                    
                                            });
                                        }

                                    });
    
                                });

                            });
                            
    
                        });

                    });

                });

            });
            
        }catch(exp){
            console.log('error insertando compra');
            console.log(exp);
        }
    });
}

exports.getListComprasByIdEmpresa = async (idEmp, nombreOrCiRuc, noDoc, fechaIni, fechaFin, nombreBd) => {
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

            const queryGetListaVentas = `SELECT compra_id as id, compra_fecha_hora AS fechaHora, compra_tipo AS documento,compra_numero AS numero, compra_total AS total,
                                            usu_username AS usuario,pro_nombre_natural AS proveedor,pro_documento_identidad AS cc_ruc_pasaporte,
                                            compra_forma_pago AS forma_pago,compra_observaciones AS Observaciones 
                                            FROM ${nombreBd}.compras,${nombreBd}.proveedores,${nombreBd}.usuarios 
                                            WHERE compra_empresa_id= ? AND compra_usu_id=usu_id AND compra_proveedor_id=pro_id 
                                            AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ?
                                            AND  compra_fecha_hora  BETWEEN ? AND ? `;
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

exports.getListResumenComprasByIdEmpresa = async (idEmp, nombreOrCiRuc, noDoc, fechaIni, fechaFin, nombreBd) => {
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

            const queryGetListaResumenVentas = `SELECT compra_fecha_hora AS fechaHora, compra_tipo AS documento,compra_numero AS numero,
            pro_nombre_natural AS proveedor,pro_documento_identidad AS cc_ruc_pasaporte,compra_forma_pago AS forma_pago,compra_subtotal_12 AS subtotalIva,
            compra_subtotal_0 AS subtotalCero, compra_valor_iva AS valorIva,compra_total AS total 
            FROM ${nombreBd}.compras,${nombreBd}.proveedores,${nombreBd}.usuarios WHERE compra_empresa_id=? 
            AND compra_usu_id=usu_id AND compra_proveedor_id=pro_id AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ?
            AND compra_fecha_hora BETWEEN ? AND ? `;

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
            console.log('error obteniendo lista resumen compras');
            console.log(exception);
        }
    });
};

exports.getOrCreateProveedorGenericoByIdEmp = async (idEmp,nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const consumidorFinalName = 'PROVEEDOR GENERICO';
            
            const queryGetConsumidorFinal = `SELECT * FROM ${nombreBd}.proveedores WHERE pro_empresa_id = ? AND pro_nombre_natural LIKE ? LIMIT 1`;
            const insertDefaultProveedorGenerico = `INSERT INTO ${nombreBd}.proveedores (pro_empresa_id, pro_documento_identidad, pro_tipo_documento_identidad, 
                                                    pro_nombre_natural, pro_telefono,pro_direccion) VALUES (?,?,?,?,?,?)`

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

                    pool.query(insertDefaultProveedorGenerico, [idEmp,'9999999999','CI',
                                consumidorFinalName,'0999999999', consumidorFinalName], (error, resultado) => {
                        if(error){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: 'error insertando proveedor generico'
                            });
                            return;
                        }

                        const idInserted = resultado.insertId;
                        const resultData = {
                            pro_id: idInserted,
                            pro_documento_identidad: '9999999999',
                            pro_nombres_natural: consumidorFinalName,
                            pro_telefono: '0999999999'
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

exports.getNextNumeroSecuencialByIdEmp = async(idEmp,tipoDoc,idProveedor,compraNumero, nombreBd) => {

    return new Promise((resolve, reject) => {
        try{
            const queryNextSecencial = `SELECT CAST(MID(compra_numero,9,15) AS UNSIGNED) AS numero FROM ${nombreBd}.compras WHERE compra_numero LIKE ? AND compra_empresa_id = ? 
            AND compra_proveedor_id = ? AND compra_tipo =? ORDER BY  CAST(MID(compra_numero,9,15) AS UNSIGNED) DESC LIMIT 1`;

            pool.query(queryNextSecencial, [`${compraNumero}-%`,idEmp,idProveedor,tipoDoc], function(error, results){
                if(error){
                    console.log('error consltando sigiente secuencial');
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }

                if(!results[0] || results == undefined || results == null || !results[0].numero){
                    resolve({
                        isSucess: true,
                        code: 200,
                        data: 1
                    });

                    return;
                }
                
                resolve({
                    isSucess: true,
                    code: 200,
                    data: (results[0].numero) ? Number(results[0].numero) + 1 : 1
                });

            });
        }catch(exception){
            console.log('error obteniendo siguiente secuencial');
            reject('error obteniendo siguiente secuencial');
        }
    });
}

exports.deleteCompraByIdEmpresa = async (datos) => {
    return new Promise((resolve, reject) => {

        try{

            const {idEmpresa,idCompra,tipoDoc, nombreBd} = datos;

            const sqlSelectDetalleCompra = `SELECT * FROM ${nombreBd}.compras_detalles WHERE comprad_compra_id = ?`;
            const sqlQueryUpdatePlusStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock + ?) WHERE prod_empresa_id = ? AND prod_id = ?`
            const sqlQueryUpdateMinusStockProducto = `UPDATE ${nombreBd}.productos SET prod_stock = (prod_stock - ?) WHERE prod_empresa_id = ? AND prod_id = ?`
            const queryDeleteCompraByIdEmp = `DELETE FROM ${nombreBd}.compras WHERE compra_id = ? AND compra_empresa_id = ? LIMIT 1`;

            pool.getConnection(function(error, connection){
                connection.beginTransaction(function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            reject('error en conexion transaction');
                            return;
                        });
                    }

                    let isPlusInventario;
                    if(tipoDoc.includes('04 Nota de crédito') || tipoDoc.includes('66 Nota de Crédito NO DEDUCIBLE')
                    || tipoDoc.includes('47 N/C por Reembolso Emitida por Intermediario') ){
                        isPlusInventario = true;
                    }else{
                        isPlusInventario = false;
                    }

                    connection.query(sqlSelectDetalleCompra, [idCompra], function(erro, results){
                        if(erro){
                            connection.rollback(function(){ connection.release()});
                            reject({
                                code: 400,
                                message: erro.message
                            });
                            return;
                        }

                        const listCompraDetalle = Array.from(results);
                        listCompraDetalle.forEach((compraDetalle, index) => {
                            const cantidad = compraDetalle.comprad_cantidad;
                            const prodId = compraDetalle.comprad_pro_id;
                            
                            connection.query(isPlusInventario? sqlQueryUpdatePlusStockProducto: sqlQueryUpdateMinusStockProducto,
                                [cantidad,idEmpresa,prodId], function(errorrr, results){
                                if(errorrr){
                                    connection.rollback(function(){ connection.release()});
                                    reject('error con stock inventario');
                                    return;
                                }
                               
                                if(index == listCompraDetalle.length - 1){
                                    connection.query(queryDeleteCompraByIdEmp, [idCompra,idEmpresa], function (errores, resultsss){
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
                                                    reject('Error eliminando compra');
                                                    return;
                                                });   
                                            }
                                            connection.release();
                                            resolve({
                                                isSuccess: true,
                                                message: 'Compra eliminada correctamente'
                                            })
                                        });
    
                                    });
                                }

                            });
                        });

                        
                    });


                });
            });

        }catch(exception){
            console.log('error eliminando venta');
            console.log(exception);
        }
    });
}

exports.getDataByIdCompra = async (idCompra, idEmp, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const queryListCompraDelleByIdCompra = `SELECT comprad_cantidad,comprad_descuento,comprad_id,comprad_iva,
            comprad_pro_id,comprad_producto,comprad_compra_id,comprad_vt,comprad_vu,prod_codigo, prod_pvp AS prod_precio 
            FROM ${nombreBd}.compras_detalles, ${nombreBd}.productos 
            WHERE comprad_pro_id = prod_id AND comprad_compra_id = ?`;
            const queryGetListaCompras = `SELECT compra_id as id, compra_fecha_hora AS fechaHora, compra_tipo AS documento,compra_numero AS numero,
                                         compra_total AS total, compra_subtotal_12 AS subtotal12, compra_subtotal_0 AS subtotal0, compra_valor_iva AS valorIva,
                                         compra_sri_sustento AS sustentoSri, compra_autorizacion_sri AS numeroAutorizacion,
                                         usu_username AS usuario,pro_nombre_natural AS proveedor,pro_id as proveedorId,pro_telefono as proveedorTele,
                                         pro_direccion as proveedorDir,pro_email as proveedorEmail,pro_documento_identidad AS cc_ruc_pasaporte,
                                         compra_forma_pago AS forma_pago,compra_observaciones AS Observaciones 
                                         FROM ${nombreBd}.compras,${nombreBd}.proveedores,${nombreBd}.usuarios WHERE compra_empresa_id=? AND compra_usu_id=usu_id AND compra_proveedor_id=pro_id 
                                         AND compra_id = ? `;

            pool.query(queryGetListaCompras,[idEmp,idCompra], (error, results) => {
                
                if(error){
                    console.log(error);
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: 'ocurrio un error'
                    });
                    return;
                }

                if(results.length > 0){
                    pool.query(queryListCompraDelleByIdCompra,[idCompra], (errorr, resultss) => {
                    
                        if(errorr){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: 'ocurrio un error obteniendo compra detalle'
                            });
                            return;
                        }
    
                        let sendResult = results[0];
                        sendResult['data'] = resultss;
    
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
                        messageError: 'no existe compra con ese id empresa',
                        notExist: true
                    });
                    return;
                }

            });

        }catch(exception){
            console.log('error obteniendo lista de compras');
            console.log(exception);
        }
    });
}


exports.getListaComprasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileListaCompras(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd);
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

exports.getListaResumenComprasExcel = async (idEmpresa, fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileResumenCompras(idEmpresa,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd);
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


function createExcelFileListaCompras(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd){

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

            const queryGetListaVentas = `SELECT compra_id as id, compra_fecha_hora AS fechaHora, compra_tipo AS documento,compra_numero AS numero, compra_total AS total,
                                            usu_username AS usuario,pro_nombre_natural AS proveedor,pro_documento_identidad AS cc_ruc_pasaporte,
                                            compra_forma_pago AS forma_pago,compra_observaciones AS Observaciones 
                                            FROM ${nombreBd}.compras,${nombreBd}.proveedores,${nombreBd}.usuarios 
                                            WHERE compra_empresa_id= ? AND compra_usu_id=usu_id AND compra_proveedor_id=pro_id 
                                            AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ?
                                            AND  compra_fecha_hora  BETWEEN ? AND ? `;
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

            const arrayData = Array.from(results);

            const workBook = new excelJS.Workbook(); // Create a new workbook
            const worksheet = workBook.addWorksheet("Lista Compras");
            const path = `./files/${idEmp}`;

            worksheet.columns = [
                {header: 'Fecha Hora', key:'fechahora', width: 20},
                {header: 'Documento', key:'documento',width: 20},
                {header: 'Numero', key:'numero',width: 20},
                {header: 'Total', key:'total',width: 20},
                {header: 'Proveedor', key:'proveedor',width: 50},
                {header: 'Identificacion', key:'identificacion',width: 20},
                {header: 'Forma de Pago', key:'formapago',width: 20}
            ];
        
            
            arrayData.forEach(valor => {
                let valorInsert = {
                    fechahora: valor.fechaHora,
                    documento: valor.documento,
                    numero: valor.numero,
                    total: valor.total,
                    proveedor: valor.proveedor,
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

                const nameFile = `/${Date.now()}_listacompras.xlsx`;
        
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

function createExcelFileResumenCompras(idEmp,fechaIni,fechaFin,nombreOrCiRuc, noDoc, nombreBd){

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

            const queryGetListaResumenVentas = `SELECT compra_fecha_hora AS fechaHora, compra_tipo AS documento,compra_numero AS numero,
            pro_nombre_natural AS proveedor,pro_documento_identidad AS cc_ruc_pasaporte,compra_forma_pago AS forma_pago,compra_subtotal_12 AS subtotalIva,
            compra_subtotal_0 AS subtotalCero, compra_valor_iva AS valorIva,compra_total AS total 
            FROM ${nombreBd}.compras,${nombreBd}.proveedores,${nombreBd}.usuarios WHERE compra_empresa_id=? 
            AND compra_usu_id=usu_id AND compra_proveedor_id=pro_id AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ?
            AND compra_fecha_hora BETWEEN ? AND ? `;

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

                const arrayData = Array.from(results);

            const workBook = new excelJS.Workbook(); // Create a new workbook
            const worksheet = workBook.addWorksheet("Resumen Compras");
            const path = `./files/${idEmp}`;

            worksheet.columns = [
                {header: 'Fecha Hora', key:'fechahora', width: 20},
                {header: 'Documento', key:'documento',width: 20},
                {header: 'Numero', key:'numero',width: 20},
                {header: 'Total', key:'total',width: 20},
                {header: 'Proveedor', key:'proveedor',width: 50},
                {header: 'Identificacion', key:'identificacion',width: 20},
                {header: 'Forma de Pago', key:'formapago',width: 20}
            ];
        
            
            arrayData.forEach(valor => {
                let valorInsert = {
                    fechahora: valor.fechaHora,
                    documento: valor.documento,
                    numero: valor.numero,
                    proveedor: valor.proveedor,
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

                const nameFile = `/${Date.now()}_listacompras.xlsx`;
        
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


exports.getXmlSoapService = async (numeroAutorizacion) =>{
    return new Promise(async (resolve, reject) => {
        try{
            const urlSoapXml = 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

            const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
                 <soapenv:Header/>
                 <soapenv:Body>
                    <ec:autorizacionComprobante>
                       <!--Optional:-->
                       
                        <claveAccesoComprobante>${numeroAutorizacion}</claveAccesoComprobante>
                    </ec:autorizacionComprobante>
                 </soapenv:Body>
              </soapenv:Envelope>`;
            
            const response = await soapRequest({url: urlSoapXml, xml: xml, timeout: 1000});
            
            const {headers, body, statusCode} = response.response;

            resolve({
                isSuccess: true,
                mensaje: 'ok',
                dataXml: body.replace(/&lt;/g,"<")
            });

        }catch(exception){
            console.log('error consultando servicio SOAP XML');
            reject({
                isSuccess: false,
                mensaje:'error consultando servicio SOAP XML'
            });
        }
    });
}


exports.generateDownloadPdfFromVentaByXmlData = (datosFactura) => {
    return new Promise((resolve, reject) => {
        try{
            const pathPdfGeneratedProm = pdfGenerator.generatePdfFromDataXmlCompra(datosFactura);
            
            pathPdfGeneratedProm.then(
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

        }
    });
};
