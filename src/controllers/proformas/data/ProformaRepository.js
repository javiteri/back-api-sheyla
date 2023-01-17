const pool = require('../../../connectiondb/mysqlconnection')
const excelJS = require("exceljs");
const fs = require('fs');
const pdfGenerator = require('../../pdf/PDFProforma');

exports.insertProforma = async (datosProforma) => {

    return new Promise(async (resolve, reject) => {

        let conexion = await pool.getConnection();

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
                                        prof_observaciones, prof_unico) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
            const sqlQueryInsertProformaDetalle = `INSERT INTO ${nombreBd}.proformas_detalles (profd_prof_id,profd_prod_id,profd_cantidad, 
                                                profd_iva,profd_producto,profd_vu,profd_descuento,profd_vt) VALUES 
                                                (?,?,?,?,?,?,?,?)`;
            
            await conexion.beginTransaction();
            let results = await conexion.query(sqlQueryInsertProforma, [empresaId,proformaNumero,
                proformaFechaHora,usuId,clienteId,subtotal12,subtotal0,valorIva,ventaTotal,
                formaPago,obs, `${empresaId}_${proformaNumero}`]);
            
            const idProformaGenerated = results[0].insertId;

            const arrayListProformaDetalle = Array.from(proformaDetallesArray);
            arrayListProformaDetalle.forEach(async (proformaDetalle, index) => {

                const {prodId, cantidad,iva,nombreProd,valorUnitario,descuento,valorTotal} = proformaDetalle;
                    
                await conexion.query(sqlQueryInsertProformaDetalle, [idProformaGenerated,prodId,
                                    cantidad,iva,nombreProd,valorUnitario,
                                    descuento,valorTotal]);
                if(index == arrayListProformaDetalle.length - 1){
                    await conexion.commit();
                    resolve({
                        isSuccess: true,
                        message: 'proforma insertada correctamente',
                        proformaId: idProformaGenerated
                    })
                }
            });            
        }catch(exp){
            conexion.rollback();
            conexion.release();
            reject({
                isSuccess: false,
                error: 'error insertando Proforma',
                isDuplicate: 
                (exp.sqlMessage.includes('Duplicate entry') || exp.sqlMessage.includes('prof_unico'))
            });
        }
    });
}

exports.getListProformasByIdEmpresa = async(idEmpresa, nombreOrCiRuc, noDoc, fechaIni, fechaFin, nombreBd) =>{
    return new Promise(async (resolve, reject) =>{
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

            const response = await pool.query(queryGetListaVentas, [idEmpresa, "%"+valueNombreClient+"%", "%"+valueCiRucClient+"%", "%"+noDoc+"%", fechaIni,fechaFin]);

            resolve({
                isSucess: true,
                code: 200,
                data: response[0]
            });

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error al obtener la lista de proformas, reintente'
            });
        }
    });
}

exports.getNoProformaSecuencialByIdusuarioAndEmp = async(idEmp, idUsuario, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{
            
            const querySelectNoProforma = `SELECT MAX(CAST(prof_numero as UNSIGNED)) AS numero FROM ${nombreBd}.proformas WHERE prof_empresa_id = ?`;

            let results = await pool.query(querySelectNoProforma, [idEmp]); 
            
            if(results[0].length <= 0){
                resolve({
                    isSucess: true,
                    numeroProf: 1,
                });
                return;
            }

            let numeroProforma = results[0][0].numero;

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


        }catch(exception){
            console.log('exception');
            reject('error obteniendo datos secuencial proforma');
        }
    });
}

exports.deleteProformaEstadoAnuladoByIdEmpresa = async (datos) => {
    return new Promise(async (resolve, reject) => {

        try{
            const {idEmpresa,idProforma,nombreBd} = datos;

            const queryDeleteProformaByIdEmp = `DELETE FROM ${nombreBd}.proformas WHERE prof_id = ? AND prof_empresa_id = ? LIMIT 1`;

            await pool.query(queryDeleteProformaByIdEmp, [idProforma, idEmpresa]); 
            resolve({
                isSuccess: true,
                message: 'proforma eliminada correctamente'
            });

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                message: 'error eliminando proforma'
            });
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

            const queryGetListaVentas = `SELECT prof_id as id, prof_fecha_hora AS fechaHora, prof_numero,
                                         prof_anulado , prof_total AS total,usu_username AS usuario,cli_nombres_natural AS cliente, cli_documento_identidad AS cc_ruc_pasaporte,
                                         prof_forma_pago AS forma_pago,prof_observaciones AS Observaciones
                                         FROM ${nombreBd}.proformas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE prof_empresa_id=? AND prof_usu_id=usu_id AND prof_cliente_id=cli_id 
                                         AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND 
                                         prof_numero LIKE ?
                                         AND  prof_fecha_hora  BETWEEN ? AND ?
                                         ORDER BY prof_id DESC`;

            let results = await pool.query(queryGetListaVentas, [idEmp, "%"+valueNombreClient+"%", 
                                         "%"+valueCiRucClient+"%", "%"+noDoc+"%", fechaIni,fechaFin]); 
                
                const arrayData = Array.from(results[0]);

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
        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}


exports.generateDownloadPdfFromProforma = (idEmp, idProforma, identificacionCliente, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        const sqlQuerySelectEmp = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ? LIMIT 1`;
        const sqlQuerySelectClienteByIdEmp = `SELECT * FROM ${nombreBd}.clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectProformaByIdEmp = `SELECT proformas.*, usu_nombres FROM ${nombreBd}.proformas, ${nombreBd}.usuarios WHERE prof_usu_id = usu_id AND prof_id = ? AND prof_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectProformaDetallesByIdProforma = `SELECT proformas_detalles.*, prod_codigo FROM ${nombreBd}.proformas_detalles, ${nombreBd}.productos WHERE 
                                                            profd_prod_id = prod_id AND profd_prof_id = ? `;

        try{
            const responseDatosEmpresa = await pool.query(sqlQuerySelectEmp,[idEmp]);
            const responseDatosCliente = await pool.query(sqlQuerySelectClienteByIdEmp, [identificacionCliente, idEmp]);
            const responseDatosProforma = await pool.query(sqlQuerySelectProformaByIdEmp, [idProforma, idEmp]);
            const responseDatosProformaDetalles = await pool.query(sqlQuerySelectProformaDetallesByIdProforma, [idProforma]);

            // GENERATE PDF WITH DATA                            
            responseDatosProforma[0]['listProformasDetalles'] = responseDatosProformaDetalles[0];
            
            const pathPdfGenerated = pdfGenerator.generatePdfFromProforma(responseDatosEmpresa[0],responseDatosCliente[0], responseDatosProforma[0]);

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

exports.getDataByIdProforma = async (idProforma, idEmp, ruc, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{
            const queryListProformaDelleByIdProforma = `SELECT profd_cantidad,profd_descuento,profd_id,profd_iva,
                                        profd_prod_id,profd_producto,profd_prof_id,profd_vt,profd_vu,prod_codigo 
                                        FROM ${nombreBd}.proformas_detalles, ${nombreBd}.productos 
                                        WHERE profd_prod_id = prod_id AND profd_prof_id = ?`;
            const queryGetListaProforma = `SELECT prof_id as id, prof_fecha_hora AS fechaHora, prof_numero AS numero,
                                         prof_anulado as anulado, prof_total AS total, prof_subtotal_12 AS subtotal12, prof_subtotal_0 AS subtotal0, 
                                         prof_valor_iva AS valorIva,
                                         usu_username AS usuario,cli_nombres_natural AS cliente,cli_id as clienteId,cli_teleono as clienteTele,
                                         cli_direccion as clienteDir,cli_email as clienteEmail,cli_documento_identidad AS cc_ruc_pasaporte,cli_teleono AS telefono,
                                         prof_forma_pago AS forma_pago,prof_observaciones AS 'Observaciones' 
                                         FROM ${nombreBd}.proformas,${nombreBd}.clientes,${nombreBd}.usuarios WHERE prof_empresa_id=? AND prof_usu_id=usu_id 
                                         AND prof_cliente_id=cli_id 
                                         AND prof_id = ? `;

            const listaProformaResponse = await pool.query(queryGetListaProforma,[idEmp, idProforma]);
   
            if(listaProformaResponse[0].length > 0){
                const responseListProforma = await pool.query(queryListProformaDelleByIdProforma,[idProforma]);

                let sendResult = listaProformaResponse[0][0];
                sendResult['data'] = responseListProforma[0];

                resolve({
                    isSucess: true,
                    code: 200,
                    data: sendResult
                });
            }else{
                reject({
                    isSucess: false,
                    code: 400,
                    messageError: 'no existe proforma con ese id empresa',
                    notExist: true
                });
                return;
            }

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                messageError: 'error obteniendo lista de proforma'
            });
        }
    });
}