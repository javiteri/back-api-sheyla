const pool = require('../../../connectiondb/mysqlconnection');
const poolEFactra = require('../../../connectiondb/mysqlconnectionlogin');
const excelJS = require("exceljs");
const fs = require('fs');
const pdfGenerator = require('../../pdf/PDFGenerator');
const sharedFunctions = require('../../../util/sharedfunctions');

//const {docElectronicoQueue} = require('../../../jobs/queue');
const {docElectronicosValidarQueue} = require('../../../jobs/queue');

const codDoc = [
    {
        nombre: 'Factura',
        codigo: '01',
    },
    {
        nombre: `
        LIQUIDACIÓN DE COMPRA DE 
        BIENES Y PRESTACIÓN DE 
        SERVICIOS`,
        codigo: '03'
    },
    {
        nombre: 'NOTA DE CRÉDITO',
        codigo: '04',
    },
    {
        nombre: 'NOTA DE DÉBITO',
        codigo: '05',
    },
    {
        nombre: 'GUÍA DE REMISIÓN ',
        codigo: '06',
    },
    {
        nombre: 'COMPROBANTE DE RETENCIÓN',
        codigo: '07',
    }
];


exports.getNumDocByAutorizar = async(rucEmpresa) =>{
    return new Promise(async (resolve, reject) =>{
        try{
            const queryPlanEnviados = `SELECT EMPRESA_WEB_PLAN_CANTIDAD, EMPRESA_WEB_PLAN_ENVIADOS
                                        FROM empresas WHERE EMPRESA_RUC = ?`;
            let resultPlan = await poolEFactra.query(queryPlanEnviados, [rucEmpresa]);
            
            if(resultPlan[0].length > 0){  
                    
                let planCantidad = Number(resultPlan[0][0].EMPRESA_WEB_PLAN_CANTIDAD);
                let planEnviados = Number(resultPlan[0][0].EMPRESA_WEB_PLAN_ENVIADOS);
                let total = planCantidad - planEnviados;

                resolve({
                    isSucess: true,
                    mensaje: 'ok',
                    docRestantes : total
                });
            }else{
                resolve({
                    isSucess: false,
                    mensaje: 'no cuenta con un plan de documentos vigente'
                });
            }
        
        }catch(exception){
            reject({
                isSucess: false,
                mensaje: 'error consultando documentos disponibles'
            });
        }
    });
}

exports.autorizarListDocumentos = async(listDoc, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try{    
            // GET LISTA DE DOCUMENTOS 
            // Y ENVIARLOS EN UN FOR PARA SU VALIDACION
            for(const documento of listDoc){
                const {idEmp, id,identificacion,VENTA_TIPO, estado} = documento;

                const objSendJob = {
                    idEmp: idEmp,
                    id: id,
                    identificacion: identificacion,
                    tipoVenta: VENTA_TIPO,
                    estado: estado,
                    nombreBd: nombreBd
                }   

                // SEND DATA TO QUEUE
                docElectronicosValidarQueue.add(objSendJob,{
                    removeOnComplete: true,
                    removeOnFail: true,
                    attempts: 100,
                    backoff: {
                        type: 'fixed',
                        delay: 60000
                    }
                });
            }
            
            resolve({
                isSucess: true,
                mensaje: 'Documentos Enviados para su autorizacion, deberia esperar'
            });
        }catch(exception){
            reject({
                isSucess: false,
                mensaje: 'ocurrio un error autorizando lista de documentos'
            });
        }
    });
}

exports.getDocumentosElectronicosByIdEmp = async(datosFiltrar) => {
    return new Promise(async (resolve, reject) => {
        try{
            const {idEmp, fechaIni, fechaFin, tipo, nodoc,nombresci, nombreBd} = datosFiltrar;

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombresci){
                const containsNumber =  /^[0-9]*$/.test(nombresci);
                valueCiRucClient = containsNumber ? nombresci : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombresci : "";
            }
            
            const sqlQueryDocumentosElectronicos = `SELECT venta_electronica_observacion,VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado 
            FROM ${nombreBd}.ventas,${nombreBd}.clientes WHERE venta_empresa_id = ?  AND venta_cliente_id=cli_id AND venta_tipo = ?
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_fecha_hora BETWEEN ? AND ?
            AND CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ? AND venta_anulado=0 ORDER BY venta_id DESC`;

            let results = await pool.query(sqlQueryDocumentosElectronicos, [idEmp,'FACTURA',"%"+valueNombreClient+"%",
                            "%"+valueCiRucClient+"%", fechaIni, fechaFin,"%"+nodoc+"%", idEmp,"%"+tipo,
                            fechaIni,fechaFin,"%"+valueNombreClient+"%", "%"+valueCiRucClient+"%","%"+nodoc+"%"]);
            
            resolve({
                isSucess: true,
                data: results[0]
            });
        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                message: 'Error obteniendo documentos electronicos'
            });
        }
    });
}

exports.getDocumentosElectronicosByIdEmpNoAutorizados = async(datosFiltrar) => {
    return new Promise(async (resolve, reject) => {
        try{
            const {idEmp, nombreBd} = datosFiltrar;
            
            const sqlQueryDocumentosElectronicos = `SELECT venta_electronica_observacion,VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado 
            FROM ${nombreBd}.ventas,${nombreBd}.clientes WHERE venta_empresa_id = ? 
            AND venta_cliente_id=cli_id AND venta_electronica_estado != 2 AND venta_anulado= 0 AND VENTA_TIPO = ? ORDER BY venta_id DESC`;

            let results = await pool.query(sqlQueryDocumentosElectronicos, [idEmp, 'FACTURA']);
            resolve({
                isSucess: true,
                data: results[0]
            });
        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                message: 'Error obteniendo documentos electronicos'
            });
        }
    });
}

exports.getListDocElectronicosExcel = async (datosFiltro) => {
    return new Promise((resolve, reject) => {
        try{
            const promiseGetListDocs = createExcelDocumentosElectronicos(datosFiltro);
            promiseGetListDocs.then(
                function(documentos){
                    resolve(documentos);
                },
                function(error){
                    return reject(error);
                }
            );
        }catch(exception){
            reject('error creando excel');
        }
    });
}

function createExcelDocumentosElectronicos(datosFiltro){
    return new Promise(async (resolve, reject) => {
        try{

            const {idEmp, fechaIni, fechaFin, tipo, nodoc,nombresci, rucEmp, nombreBd} = datosFiltro;

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombresci){
                const containsNumber =  /^[0-9]*$/.test(nombresci);
                valueCiRucClient = containsNumber ? nombresci : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombresci : "";
            }

            const sqlQueryDocumentosElectronicos = `SELECT VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, venta_001,venta_002,venta_numero, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado 
            FROM ${nombreBd}.ventas,${nombreBd}.clientes WHERE venta_empresa_id = ?  AND venta_cliente_id=cli_id AND venta_tipo LIKE ?
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_fecha_hora BETWEEN ? AND ?
            AND CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ? AND venta_anulado=0 
            UNION ALL 
            SELECT compra_tipo,compra_id,compra_fecha_hora,compra_numero,compra_numero,compra_numero,compra_numero, compra_total AS total, pro_nombre_natural, pro_documento_identidad AS identificacion,
            compra_forma_pago , compra_electronica_estado 
            FROM ${nombreBd}.compras,${nombreBd}.proveedores  WHERE compra_empresa_id = ? AND compra_proveedor_id=pro_id AND compra_tipo LIKE ?
            AND compra_fecha_hora  BETWEEN ? AND ?
            AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ? `;

            let results = await pool.query(sqlQueryDocumentosElectronicos, [idEmp,"%"+tipo,"%"+valueNombreClient+"%",
                            "%"+valueCiRucClient+"%", fechaIni, fechaFin,"%"+nodoc+"%", idEmp,"%"+tipo,
                            fechaIni,fechaFin,"%"+valueNombreClient+"%","%"+valueCiRucClient+"%","%"+nodoc+"%"]);

                const arrayData = Array.from(results[0]);
                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Lista Documentos Electronicos");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Fecha', key:'fecha', width: 20},
                    {header: 'No. Factura', key:'numerofactura',width: 30},
                    {header: 'Cliente', key:'cliente',width: 50},
                    {header: 'CI/RUC', key:'identificacion',width: 20},
                    {header: 'Forma de Pago', key:'formapago',width: 30},
                    {header: 'Estado', key:'estado',width: 30},
                    {header: 'Clave de Acceso', key:'claveacceso',width: 50}
                ];
            
                arrayData.forEach(valor => {

                    const now = new Date(valor.fecha);
                    const dayVenta = now.getDate().toString().padStart(2,'0');
                    const monthVenta = (now.getMonth() + 1).toString().padStart(2,'0');
                    const yearVenta = now.getFullYear().toString();

                    let dateString = `${dayVenta}/${monthVenta}/${yearVenta}`;
                    let rucEmpresa = rucEmp;
                    let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(valor.VENTA_TIPO); //getTipoComprobanteVenta(valor.VENTA_TIPO);
                    let tipoAmbiente = '2';//PRODUCCION //PRUEBAS '1    '
                    let serie = `${valor.venta_001}${valor.venta_002}`;
                    let codigoNumerico = '12174565';
                    let secuencial = (valor.venta_numero).padStart(9,'0');
                    let tipoEmision = 1;
                                                           
                    let digit48 = `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
                                                
                    //let claveAcceso = modulo11(digit48);
                    let claveAcceso = sharedFunctions.modulo11(digit48);

                    let valorInsert = {
                        fecha: dateString,
                        numerofactura: valor.numeroFactura,
                        cliente: valor.cliente,
                        identificacion: valor.identificacion,
                        formapago: valor.formaPago,
                        estado: valor.estado,
                        claveacceso: claveAcceso,
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
                    const nameFile = `/${Date.now()}_doc_electronicos.xlsx`;
                    
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
                }catch(error){
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


exports.generateDownloadPdfFromVenta = (idEmp, idVentaCompra, identificacionClienteProv, isPdfNormal, nombreBd) => {
    return new Promise(async (resolve, reject) => {

        // const queryValorIvaEmp = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id = ? AND con_nombre_config LIKE ?`;
        const querySelectConfigFactElectr = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
        const sqlQuerySelectEmp = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ? LIMIT 1`;
        const sqlQuerySelectClienteByIdEmp = `SELECT * FROM ${nombreBd}.clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectVentaByIdEmp = `SELECT ventas.*, usu_nombres FROM ${nombreBd}.ventas, ${nombreBd}.usuarios WHERE venta_usu_id = usu_id AND venta_id = ? AND venta_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectVentaDetallesByIdVenta = `SELECT ventas_detalles.*, prod_codigo FROM ${nombreBd}.ventas_detalles, ${nombreBd}.productos WHERE 
                                                            ventad_prod_id = prod_id AND ventad_venta_id = ? `;
        const sqlQuerySelectDatosEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_establecimiento = ? LIMIT 1`;

        try{

            // const responseConfigValorIva = await pool.query(queryValorIvaEmp, [idEmp, '%FACTURA_VALORIVA%']);
            const responseDatosConfig = await pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%']);
            const responseDatosEmpresa = await pool.query(sqlQuerySelectEmp,[idEmp]);
            const responseDatosCliente = await pool.query(sqlQuerySelectClienteByIdEmp, [identificacionClienteProv,idEmp]);
            const responseDatosVenta = await pool.query(sqlQuerySelectVentaByIdEmp, [idVentaCompra,idEmp]);
            const responseDatosVentaDetalles = await pool.query(sqlQuerySelectVentaDetallesByIdVenta, [idVentaCompra]);
            const responseDatosEstablecimiento = await pool.query(sqlQuerySelectDatosEstablecimiento, [idEmp, responseDatosVenta[0][0].venta_001]);

            let valorIva = "12";
            if(responseDatosVentaDetalles[0].length > 0){
                let valor = responseDatosVentaDetalles[0].find((value) => {
                    return Number(value['ventad_iva']) == 8;
                });
                if(valor){
                    valorIva = "8"
                }
            }
            
            // GENERATE PDF WHIT DATA                            
            responseDatosVenta[0]['listVentasDetalles'] = responseDatosVentaDetalles[0];
            
            const pathPdfGeneratedProm = pdfGenerator.generatePdfFromVenta(valorIva, responseDatosEmpresa[0],responseDatosCliente[0],
                                                                            responseDatosVenta[0], isPdfNormal, responseDatosConfig[0], 
                                                                            responseDatosEstablecimiento[0]);

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
            console.log(exception);
            reject({
                isSucess: false,
                message: 'Ocurrio un error generando el PDF'
            });
        }

    });
};
