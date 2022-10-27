const pool = require('../../../connectiondb/mysqlconnection');
const poolEFactra = require('../../../connectiondb/mysqlconnectionlogin');
const excelJS = require("exceljs");
const fs = require('fs');
const xmlBuilder = require('xmlbuilder');
const pdfGenerator = require('../../pdf/PDFGenerator');
const sharedFunctions = require('../../../util/sharedfunctions');


const {docElectronicoQueue} = require('../../../jobs/queue');

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

exports.autorizarListDocumentos = async(listDoc) => {
    return new Promise((resolve, reject) => {
        try{
            // GET LISTA DE DOCUMENTOS 
            // Y ENVIARLOS EN UN FOR PARA SU VALIDACION
            for(const documento of listDoc){
                const {idEmp, id,identificacion,VENTA_TIPO} = documento;
                console.log('before send');
                prepareAndSendDocumentoElectronicoAsync(idEmp, id,identificacion,VENTA_TIPO);
                console.log('after send');
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
    return new Promise((resolve, reject) => {
        try{
            const {idEmp, fechaIni, fechaFin, tipo, nodoc,nombresci} = datosFiltrar;

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombresci){
                const containsNumber =  /^[0-9]*$/.test(nombresci);
                valueCiRucClient = containsNumber ? nombresci : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombresci : "";
            }


            const sqlQueryDocumentosElectronicos = `SELECT VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado FROM ventas,clientes WHERE venta_empresa_id = ?  AND venta_cliente_id=cli_id AND venta_tipo LIKE ?
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_fecha_hora BETWEEN ? AND ?
            AND CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ? AND venta_anulado=0 
            UNION ALL 
            SELECT compra_tipo,compra_id,compra_fecha_hora,compra_numero, compra_total AS total, pro_nombre_natural, pro_documento_identidad AS identificacion,
            compra_forma_pago , compra_electronica_estado 
            FROM compras,proveedores  WHERE compra_empresa_id = ? AND compra_proveedor_id=pro_id AND compra_tipo LIKE ?
            AND compra_fecha_hora  BETWEEN ? AND ?
            AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ? `;

            pool.query(sqlQueryDocumentosElectronicos, [idEmp,"%"+tipo,"%"+valueNombreClient+"%",
            "%"+valueCiRucClient+"%", fechaIni, fechaFin,"%"+nodoc+"%", idEmp,"%"+tipo,fechaIni,fechaFin,"%"+valueNombreClient+"%",
            "%"+valueCiRucClient+"%","%"+nodoc+"%"], function(error, results) {

                if(error){
                    console.log(error);
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'Ocurrio un error al consultar la lista de documentos electronicos'
                    });

                    return;
                }

                resolve({
                    isSucess: true,
                    data: results
                });
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
    return new Promise((resolve, reject) => {
        try{
            const {idEmp} = datosFiltrar;

            const sqlQueryDocumentosElectronicos = `SELECT VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado FROM ventas,clientes WHERE venta_empresa_id = ? 
            AND venta_cliente_id=cli_id AND venta_electronica_estado = 0 AND venta_anulado=0 
            UNION ALL 
            SELECT compra_tipo,compra_id,compra_fecha_hora,compra_numero, compra_total AS total, pro_nombre_natural, pro_documento_identidad AS identificacion,
            compra_forma_pago , compra_electronica_estado 
            FROM compras,proveedores  WHERE compra_empresa_id = ? AND compra_proveedor_id=pro_id AND compra_electronica_estado = 0`;

            pool.query(sqlQueryDocumentosElectronicos, [idEmp, idEmp], function(error, results) {

                if(error){
                    console.log(error);
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'Ocurrio un error al consultar la lista de documentos electronicos no autorizados'
                    });

                    return;
                }

                resolve({
                    isSucess: true,
                    data: results
                });
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


//------------------------------------------------------------------------------------------------------------------------
exports.atorizarDocumentoElectronico = (idEmp, idVentaCompra,identificacion,tipo) => {
    return new Promise(async (resolve,reject) => {
        try{
            prepareAndSendDocumentoElectronico(idEmp, idVentaCompra,identificacion,tipo, resolve, reject);
        }catch(exception){
            reject({
                isSucess: false,
                message: 'Error enviando documento electronico'
            });
        }
    });
};

function prepareAndSendDocumentoElectronico(idEmp, idVentaCompra,identificacion,tipo, resolve, reject){
    // VERIFICAR SI ES UNA COMPRA O VENTA POR QUE DE ESO 
    // CONSULTAR Y OBTENER LOS DATOS DE - DATOS CLIENTE O PROVEEDOR
    // - DATOS DE LA VENTA - DATOS DETALLE DE LA VENTA O COMPRA
    // CON ESOS DATOS GENERAR EL XML Y POR AHORA GUARDARLO EN UNA CARPETA EN EL SERVER
    // OBTENER LOS DATOS DEL EMISOR (LA EMPRESA) QUE ENVIA EL DOCUMENTO ELECTRONICO
    const querySelectConfigFactElectr = `SELECT * FROM config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
    const querySelectCliente = `SELECT * FROM clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
    const querySelectVenta = `SELECT ventas.*, usuarios.usu_nombres FROM ventas, usuarios WHERE venta_usu_id = usu_id AND venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
    const querySelectVentasDetalles = `SELECT ventas_detalles.* ,productos.prod_codigo, productos.prod_nombre FROM ventas_detalles, productos WHERE 
            ventad_prod_id = prod_id AND ventad_venta_id = ?`;
    const queryDatosEmpresaById = `SELECT * FROM empresas WHERE emp_id = ?`;

    pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%'], (er, datosConfig) => {
        if(er){
            console.log('error obteniendo configs');
            return reject(err);
        }

        pool.query(queryDatosEmpresaById,[idEmp], (err, datosEmpresa) => {
            if(err){
                return reject(err);
            }
    
            pool.query(querySelectCliente, [idEmp, identificacion], (error, clienteResponse) => {
                if(error){
                    return reject(error);
                }
                    
                pool.query(querySelectVenta, [idEmp, idVentaCompra], (errorr, ventaResponse) => {
                    if(errorr){
                        return reject(errorr);
                    }
        
                    pool.query(querySelectVentasDetalles, [idVentaCompra], (erro, ventaDetalleResponse) => {
                        if(erro){
                            return reject(erro);
                        }
                            
                        const valorGenerateXmlResponse = 
                                        generateXmlDocumentoElectronicoVenta(clienteResponse[0],ventaResponse[0],ventaDetalleResponse,datosEmpresa[0],datosConfig);
                        valorGenerateXmlResponse.then(
                            function(data){
                                const pathFile = data.pathFile;
                                const claveActivacion = data.claveAct;

                                //let ruc = '1718792656001';
                                //INSERT XML FILE IN DB BLOB 
                                const sqlQuerySelectEmpresa = `SELECT empresa_id FROM empresas WHERE empresa_ruc = ? LIMIT 1`;
                                const sqlQueryInsertXmlBlob = `INSERT INTO autorizaciones (auto_id_empresa,auto_clave_acceso, auto_xml) VALUES (?,?,?)`;

                                poolEFactra.query(sqlQuerySelectEmpresa,[datosEmpresa[0].EMP_RUC], function(error, results) {
                                    if(error){
                                        return reject({isSucess: false, message:'error buscando empresa'});
                                    }

                                    // READ XML FILE AS STRING
                                    let stream  = fs.createReadStream(pathFile);
                                    stream.setEncoding('utf-8');
                                    let xmlString = '';

                                    stream.on('data',function(chunk){
                                        xmlString += chunk;
                                    });

                                    stream.on('end', function() {
                                        let str = xmlString.replace(/[\n\r\t]+/g, '');
                                        poolEFactra.query(sqlQueryInsertXmlBlob,[results[0].empresa_id,claveActivacion, str], function(errores, resultss) {
                                            if(errores){
                                                return reject(
                                                    {isSucess: false, 
                                                        message: 
                                                            (errores.sqlMessage.includes('Duplicate entry')) ? 'ya existe el xml clave acceso' 
                                                                    : 'error insertando text xml db'
                                                    }
                                                );
                                            }

                                            const actualDateHours = new Date(ventaResponse[0].venta_fecha_hora);
                                            const dateString = '' + actualDateHours.getFullYear() + '-' + ('0' + (actualDateHours.getMonth()+1)).slice(-2) + 
                                                                        '-' + ('0' + actualDateHours.getDate()).slice(-2);

                                            const objSendJob = {
                                                claveAct: claveActivacion,
                                                empresaId: results[0].empresa_id,
                                                empresaIdLocal: datosEmpresa[0].EMP_ID,
                                                rucEmpresa: datosEmpresa[0].EMP_RUC,
                                                nombreEmpresa: datosEmpresa[0].EMP_NOMBRE,
                                                ciRucCliente: clienteResponse[0].cli_documento_identidad,
                                                emailCliente: clienteResponse[0].cli_email,
                                                nombreCliente:  clienteResponse[0].cli_nombres_natural,
                                                idVenta: ventaResponse[0].venta_id,
                                                tipoDocumento: ventaResponse[0].venta_tipo,
                                                documentoNumero: 
                                                                `${ventaResponse[0].venta_001}-${ventaResponse[0].venta_002}-${ventaResponse[0].venta_numero}`,
                                                ventaValorTotal: ventaResponse[0].venta_total,
                                                ventaFecha: dateString
                                            }
                                                    // SEND JOB TO QUEUE BULL
                                            docElectronicoQueue.add(objSendJob,{
                                                //delay: 30000,
                                                removeOnComplete: true,
                                                removeOnFail: true,
                                                attempts: 100,
                                                backoff: {
                                                    type: 'fixed',
                                                    delay: 60000
                                                }
                                            });

                                            resolve(data);
                                        });

                                    })

                                });

                            },
                            function(error){
                                reject(error);
                            }
                        );
                    });
                });
            });
    
        });

    });
}


function generateXmlDocumentoElectronicoVenta(datosCliente, datosVenta, listVentaDetalle,datosEmpresa, datosConfig){

    return new Promise((resolve, reject) => {
        try{
            //console.log(datosConfig);
            let contribuyenteEspecial = '';
            let obligadoContabilidad = false;
            let perteneceRegimenRimpe = false;
            let agenteDeRetencion = '';

            if(datosConfig && datosConfig.length > 0){
                datosConfig.forEach((element) => {
                    
                    if(element.con_nombre_config == 'FAC_ELECTRONICA_CONTRIBUYENTE_ESPECIAL'){
                        contribuyenteEspecial = element.con_valor;
                    }
                    if(element.con_nombre_config == 'FAC_ELECTRONICA_OBLIGADO_LLEVAR_CONTABILIDAD'){
                        obligadoContabilidad = element.con_valor === '1';
                    }
                    if(element.con_nombre_config == 'FAC_ELECTRONICA_AGENTE_RETENCION'){
                        agenteDeRetencion = element.con_valor;
                    }
                    if(element.con_nombre_config == 'FAC_ELECTRONICA_PERTENECE_REGIMEN_RIMPE'){
                        perteneceRegimenRimpe = element.con_valor === '1';
                    }
                });
            }
                    
            const dateVenta = new Date(datosVenta.venta_fecha_hora);
            const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
            const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
            const yearVenta = dateVenta.getFullYear().toString();
    
            let rucEmpresa = datosEmpresa.EMP_RUC;//'1718792656001';
            let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(datosVenta.venta_tipo);
            let tipoAmbiente = '2';//PRODUCCION //PRUEBAS '1    '
            let serie = `${datosVenta.venta_001}${datosVenta.venta_002}`;
            let codigoNumerico = '12174565';
            let secuencial = (datosVenta.venta_numero).toString().padStart(9,'0');
            let tipoEmision = 1;
            let direccionMatriz = datosEmpresa.EMP_DIRECCION_MATRIZ;

            let digit48 = 
            `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
                            
            let codigoDocmento = getCodigoDocumentoByName(datosVenta.venta_tipo);
            let claveActivacion = sharedFunctions.modulo11(digit48);
 
            let tipoIdentificacionComprador = getTipoIdentificacionComprador(datosCliente.cli_documento_identidad,
                datosCliente.cli_tipo_documento_identidad);

            let identificacionComprador = (datosCliente.cli_nombres_natural == 'CONSUMIDOR FINAL' ? '9999999999999' : datosCliente.cli_documento_identidad);
            let showDireccionComprador = ((datosCliente.cli_direccion && datosCliente.cli_direccion.length > 0));

            let totalSinImpuestos = (Number(datosVenta.venta_subtotal_0) + Number(datosVenta.venta_subtotal_12)).toFixed(2);
            let totalDescuento = 0.00;
            let valorIva = Number(datosVenta.venta_valor_iva);
            let valorTotal = Number(datosVenta.venta_total);
            let codigoFormaPago = getCodigoFormaPago(datosVenta.venta_forma_pago);    
            
            try{
                Array.from(listVentaDetalle).map((valor) => {
                    if(valor.ventad_descuento && valor.ventad_descuento > 0){
                        let valorDescuento = 
                        (Number(valor.ventad_cantidad) * Number(valor.ventad_vu) * valor.ventad_descuento / 100);
                        
                        totalDescuento += valorDescuento;
                    }
                });
            }catch(exex){
                console.log(exex);
            }

            // GENERAR XML CON XMLBUILDER LIBRARY AND SET VALUES FROM DATA IN PARAMETERS 
            let rootElement = xmlBuilder.create('factura',{
                encoding: 'UTF-8',
                standalone: true
            }).att('id','comprobante').att('version','2.0.0');
            rootElement = rootElement.ele('infoTributaria').ele('ambiente',tipoAmbiente).up().ele('tipoEmision','1').up()
                                    .ele('razonSocial',/*datosEmpresa.EMP_RAZON_SOCIAL*/'LEON CASTELO MIGUEL RODRIGO').up(); 
            //rootElement.ele('nombreComercial','Prueba 2').up()
            rootElement = rootElement.ele('ruc',rucEmpresa).up()
                                    .ele('claveAcceso',claveActivacion).up().ele('codDoc',codigoDocmento).up()
                                    .ele('estab',datosVenta.venta_001).up().ele('ptoEmi',datosVenta.venta_002).up().ele('secuencial',secuencial).up()
                                   .ele('dirMatriz',direccionMatriz).up();

            if(perteneceRegimenRimpe){
                rootElement = rootElement.ele('regimenMicroempresas','CONTRIBUYENTE REGIMEN MICROEMPRESAS').up();
            }
            if(agenteDeRetencion && agenteDeRetencion.length > 0){
                rootElement = rootElement.ele('agenteRetencion', agenteDeRetencion).up();
            }

            rootElement = rootElement.up();

            let parcialElement1 = rootElement.ele('infoFactura').ele('fechaEmision',`${dayVenta}/${monthVenta}/${yearVenta}`).up()
            .ele('dirEstablecimiento',direccionMatriz).up();

            if(!(contribuyenteEspecial === '')){
                parcialElement1.ele('contribuyenteEspecial',contribuyenteEspecial).up();
            }
            if(obligadoContabilidad){
                parcialElement1.ele('obligadoContabilidad','SI').up();
            }else{
                parcialElement1.ele('obligadoContabilidad','NO').up();
            }
                        
            parcialElement1.ele('tipoIdentificacionComprador',tipoIdentificacionComprador).up()
                        .ele('razonSocialComprador',datosCliente.cli_nombres_natural).up().ele('identificacionComprador',identificacionComprador).up()
                        if(showDireccionComprador){
                            parcialElement1.ele('direccionComprador',datosCliente.cli_direccion).up()
                        }
                        parcialElement1.ele('totalSinImpuestos',totalSinImpuestos).up().ele('totalDescuento',totalDescuento.toFixed(2)).up()
                        .ele('totalConImpuestos').ele('totalImpuesto').ele('codigo','2').up().ele('codigoPorcentaje','2').up()
                        .ele('baseImponible',totalSinImpuestos).up().ele('valor',valorIva).up().up().up().ele('propina','0.00').up()
                        .ele('importeTotal', valorTotal).up()
                        .ele('moneda','DOLAR').up().ele('pagos').ele('pago').ele('formaPago',codigoFormaPago).up().ele('total',valorTotal).up()

            let detallesNode = rootElement.ele('detalles');

            for(let i = 0; i < listVentaDetalle.length; i++){

                let valorTotal = 0.0;
                let valorDescuentoTmp = 0.0;

                if(listVentaDetalle[i].ventad_descuento && listVentaDetalle[i].ventad_descuento > 0){
                    valorDescuentoTmp = 
                    (Number(listVentaDetalle[i].ventad_cantidad) * Number(listVentaDetalle[i].ventad_vu) * listVentaDetalle[i].ventad_descuento / 100);
                    
                    valorTotal = (Number(listVentaDetalle[i].ventad_cantidad) * Number(listVentaDetalle[i].ventad_vu) - valorDescuentoTmp);
                }else{
                    valorTotal = Number(listVentaDetalle[i].ventad_cantidad) * Number(listVentaDetalle[i].ventad_vu);
                }
                
                let valorIva = 0
                if(listVentaDetalle[i].ventad_iva == '12.00'){
                    valorIva = (Number(valorTotal * 12) / 100);
                }else{
                    valorIva = 0;
                }

                detallesNode = detallesNode.ele('detalle').ele('codigoPrincipal',listVentaDetalle[i].prod_codigo).up()
                .ele('codigoAuxiliar',listVentaDetalle[i].prod_codigo).up().ele('descripcion',listVentaDetalle[i].prod_nombre).up()
                .ele('cantidad',listVentaDetalle[i].ventad_cantidad).up().ele('precioUnitario',Number(listVentaDetalle[i].ventad_vu).toFixed(2)).up()

                if(listVentaDetalle[i].ventad_descuento && listVentaDetalle[i].ventad_descuento > 0){
                    detallesNode.ele('descuento',valorDescuentoTmp.toFixed(2)).up()
                }else{
                    detallesNode.ele('descuento','0').up()
                }
                
                detallesNode = detallesNode.ele('precioTotalSinImpuesto',valorTotal.toFixed(2)).up()
                .ele('impuestos').ele('impuesto');
                
                detallesNode = detallesNode.ele('codigo','2').up();

                if(listVentaDetalle[i].ventad_iva == '12.00'){
                    detallesNode = detallesNode.ele('codigoPorcentaje','2').up()
                }else{
                    detallesNode = detallesNode.ele('codigoPorcentaje','0').up()
                }

                if(listVentaDetalle[i].ventad_iva == '12.00'){
                    detallesNode = detallesNode.ele('tarifa','12.00').up()
                }else{
                    detallesNode = detallesNode.ele('tarifa','0').up()
                }
                detallesNode = detallesNode.ele('baseImponible',valorTotal.toFixed(2)).up().ele('valor',valorIva.toFixed(2)).up().up().up().up();
            }
         
            rootElement = rootElement.ele('infoAdicional').ele('campoAdicional',{'nombre':'DIRECCION'},datosCliente.cli_direccion).up()
            .ele('campoAdicional',{'nombre':'FORMA DE PAGO'},datosVenta.venta_forma_pago).up()
            .ele('campoAdicional',{'nombre':'RESPONSABLE'},datosVenta.usu_nombres).up()

            if(datosCliente.cli_email && datosCliente.cli_email.length > 0 && datosCliente.cli_email !== ' '){
                rootElement = rootElement.ele('campoAdicional',{'nombre':'EMAIL'},datosCliente.cli_email).up()
            }
            if(datosCliente.cli_teleono && datosCliente.cli_teleono.length > 0){
                rootElement.ele('campoAdicional',{'nombre':'TELEFONOS'},datosCliente.cli_teleono).up();
            }
        
            const xmlFinal = rootElement.end({pretty: true});

            // SAVE XML FILE IN FOLDER SERVER
            const path = `./files/${datosEmpresa.EMP_ID}`;
            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        return console.error(err);
                    }
    
                    fs.writeFileSync(`${path}/${datosVenta.venta_tipo}${secuencial}.xml`, xmlFinal, function(error){
                        if(error){
                            console.log('error escribiendo archivo');
                        }
                    })
                });
            }else{
                fs.writeFileSync(`${path}/${datosVenta.venta_tipo}${secuencial}.xml`, xmlFinal, function(error){
                    if(error){
                        console.log('error escribiendo archivo');
                    }
                });
            }

            resolve({
                pathFile: `${path}/${datosVenta.venta_tipo}${secuencial}.xml`,
                claveAct: claveActivacion
            });
        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando xml documento venta, reintente'
            });
        }
    });

}


function getCodigoDocumentoByName(nombreCodigoDoc){

    if(nombreCodigoDoc.includes('Factura') || nombreCodigoDoc.includes('FACTURA')){
        return '01';
    }

    if(nombreCodigoDoc.includes('03 Liquidación de compra de Bienes o Prestación de servicios')){
        return '03';
    }
}

function getTipoIdentificacionComprador(identificacion, tipoIdentificacion){

    if(identificacion == '9999999999'){
        return '07';
    }
    if(tipoIdentificacion == 'RUC'){
        return '04';
    }
    if(tipoIdentificacion == 'CI'){
        return '05';
    }

}

function getCodigoFormaPago(formaPago){

    if(formaPago.toUpperCase() == 'EFECTIVO' || formaPago.toUpperCase() == 'CREDITO'){
        return '01';
    }else{
        return '20'
    }
    /*if(formaPago == 'TARJETA DE CRÉDITO'){
        return '19';
    }
    if(formaPago == 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO'){
        return '20';
    }*/
}

//-------------------------------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------------------------------
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
    return new Promise((resolve, reject) => {
        try{

            const {idEmp, fechaIni, fechaFin, tipo, nodoc,nombresci, rucEmp} = datosFiltro;

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
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado FROM ventas,clientes WHERE venta_empresa_id = ?  AND venta_cliente_id=cli_id AND venta_tipo LIKE ?
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_fecha_hora BETWEEN ? AND ?
            AND CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ? AND venta_anulado=0 
            UNION ALL 
            SELECT compra_tipo,compra_id,compra_fecha_hora,compra_numero,compra_numero,compra_numero,compra_numero, compra_total AS total, pro_nombre_natural, pro_documento_identidad AS identificacion,
            compra_forma_pago , compra_electronica_estado 
            FROM compras,proveedores  WHERE compra_empresa_id = ? AND compra_proveedor_id=pro_id AND compra_tipo LIKE ?
            AND compra_fecha_hora  BETWEEN ? AND ?
            AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ? `;

            pool.query(sqlQueryDocumentosElectronicos, [idEmp,"%"+tipo,"%"+valueNombreClient+"%",
            "%"+valueCiRucClient+"%", fechaIni, fechaFin,"%"+nodoc+"%", idEmp,"%"+tipo,fechaIni,fechaFin,"%"+valueNombreClient+"%",
            "%"+valueCiRucClient+"%","%"+nodoc+"%"], function(error, results) {

                if(error){
                    console.log(error);
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'Ocurrio un error al consultar la lista de documentos electronicos'
                    });

                    return;
                }

                const arrayData = Array.from(results);

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
                    console.log(`exception`);
                    console.log(error);
            
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


exports.generateDownloadPdfFromVenta = (idEmp, idVentaCompra, identificacionClienteProv, isPdfNormal) => {
    return new Promise((resolve, reject) => {
        try{

            const querySelectConfigFactElectr = `SELECT * FROM config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
            const sqlQuerySelectEmp = `SELECT * FROM empresas WHERE emp_id = ? LIMIT 1`;
            const sqlQuerySelectClienteByIdEmp = `SELECT * FROM clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
            const sqlQuerySelectVentaByIdEmp = `SELECT ventas.*, usu_nombres FROM ventas, usuarios WHERE venta_usu_id = usu_id AND venta_id = ? AND venta_empresa_id = ? LIMIT 1`;
            const sqlQuerySelectVentaDetallesByIdVenta = `SELECT ventas_detalles.*, prod_codigo FROM ventas_detalles, productos WHERE 
                                                            ventad_prod_id = prod_id AND ventad_venta_id = ? `;
            pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%'], (er, datosConfig) => {
                if(er){
                    console.log('error obteniendo configs');
                    return reject(er);
                }

                pool.query(sqlQuerySelectEmp,[idEmp], (err, datosEmpresa) => {
                    if(err){
                        console.log('error inside empresa request');
                        return reject(err);
                    }
    
                    pool.query(sqlQuerySelectClienteByIdEmp, [identificacionClienteProv,idEmp], (error, clienteResponse) => {
                        if(error){
                            console.log('error inside cliente request');
                            return reject(error);
                        }
                    
                        pool.query(sqlQuerySelectVentaByIdEmp, [idVentaCompra,idEmp], (errorr, ventaResponse) => {
                            if(errorr){
                                return reject(errorr);
                            }
        
                            pool.query(sqlQuerySelectVentaDetallesByIdVenta, [idVentaCompra], (erro, ventaDetalleResponse) => {
                                if(erro){
                                    return reject(erro);
                                }
                                // GENERATE PDF WHIT DATA                            
                                ventaResponse['listVentasDetalles'] = ventaDetalleResponse;
    
                                const pathPdfGeneratedProm = pdfGenerator.generatePdfFromVenta(datosEmpresa,clienteResponse,
                                                                                                ventaResponse, isPdfNormal, datosConfig);
    
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
                                
                            });
    
                        });
    
                    });
    
                });

            });

        }catch(exception){
            reject({
                isSucess: false,
                message: 'Ocurrio un error generando el PDF'
            });
        }

    });
};


//--------------------------------------------------------------------------------------------------------------------------------
async function prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra,identificacion,tipo){
    // VERIFICAR SI ES UNA COMPRA O VENTA POR QUE DE ESO 
    // CONSULTAR Y OBTENER LOS DATOS DE - DATOS CLIENTE O PROVEEDOR
    // - DATOS DE LA VENTA - DATOS DETALLE DE LA VENTA O COMPRA
    // CON ESOS DATOS GENERAR EL XML Y POR AHORA GUARDARLO EN UNA CARPETA EN EL SERVER
    // OBTENER LOS DATOS DEL EMISOR (LA EMPRESA) QUE ENVIA EL DOCUMENTO ELECTRONICO
    const querySelectConfigFactElectr = `SELECT * FROM config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
    const querySelectCliente = `SELECT * FROM clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
    const querySelectVenta = `SELECT ventas.*, usuarios.usu_nombres FROM ventas, usuarios WHERE venta_usu_id = usu_id AND venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
    const querySelectVentasDetalles = `SELECT ventas_detalles.* ,productos.prod_codigo, productos.prod_nombre FROM ventas_detalles, productos WHERE 
            ventad_prod_id = prod_id AND ventad_venta_id = ?`;
    const queryDatosEmpresaById = `SELECT * FROM empresas WHERE emp_id = ?`;

    console.log('send to quee');
    pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%'], (er, datosConfig) => {
        if(er){
            console.log('error obteniendo configs');
            return ;
        }

        pool.query(queryDatosEmpresaById,[idEmp], (err, datosEmpresa) => {
            if(err){
                return;
            }
    
            pool.query(querySelectCliente, [idEmp, identificacion], (error, clienteResponse) => {
                if(error){
                    return;
                }
                    
                pool.query(querySelectVenta, [idEmp, idVentaCompra], (errorr, ventaResponse) => {
                    if(errorr){
                        return;
                    }
        
                    pool.query(querySelectVentasDetalles, [idVentaCompra], (erro, ventaDetalleResponse) => {
                        if(erro){
                            return;
                        }
                            
                        const valorGenerateXmlResponse = 
                                        generateXmlDocumentoElectronicoVenta(clienteResponse[0],ventaResponse[0],ventaDetalleResponse,datosEmpresa[0],datosConfig);
                        valorGenerateXmlResponse.then(
                            function(data){
                                const pathFile = data.pathFile;
                                const claveActivacion = data.claveAct;

                                //let ruc = '1718792656001';
                                //INSERT XML FILE IN DB BLOB 
                                const sqlQuerySelectEmpresa = `SELECT empresa_id FROM empresas WHERE empresa_ruc = ? LIMIT 1`;
                                const sqlQueryInsertXmlBlob = `INSERT INTO autorizaciones (auto_id_empresa,auto_clave_acceso, auto_xml) VALUES (?,?,?)`;

                                poolEFactra.query(sqlQuerySelectEmpresa,[datosEmpresa[0].EMP_RUC], function(error, results) {
                                    if(error){
                                        return;
                                    }

                                    // READ XML FILE AS STRING
                                    let stream  = fs.createReadStream(pathFile);
                                    stream.setEncoding('utf-8');
                                    let xmlString = '';

                                    stream.on('data',function(chunk){
                                        xmlString += chunk;
                                    });

                                    stream.on('end', function() {
                                        let str = xmlString.replace(/[\n\r\t]+/g, '');
                                        poolEFactra.query(sqlQueryInsertXmlBlob,[results[0].empresa_id,claveActivacion, str], function(errores, resultss) {
                                            if(errores){
                                                return; /*reject(
                                                    {isSucess: false, 
                                                        message: 
                                                            (errores.sqlMessage.includes('Duplicate entry')) ? 'ya existe el xml clave acceso' 
                                                                    : 'error insertando text xml db'
                                                    }
                                                );*/
                                            }

                                            const actualDateHours = new Date(ventaResponse[0].venta_fecha_hora);
                                            const dateString = '' + actualDateHours.getFullYear() + '-' + ('0' + (actualDateHours.getMonth()+1)).slice(-2) + 
                                                                        '-' + ('0' + actualDateHours.getDate()).slice(-2);

                                            const objSendJob = {
                                                claveAct: claveActivacion,
                                                empresaId: results[0].empresa_id,
                                                empresaIdLocal: datosEmpresa[0].EMP_ID,
                                                rucEmpresa: datosEmpresa[0].EMP_RUC,
                                                nombreEmpresa: datosEmpresa[0].EMP_NOMBRE,
                                                ciRucCliente: clienteResponse[0].cli_documento_identidad,
                                                emailCliente: clienteResponse[0].cli_email,
                                                nombreCliente:  clienteResponse[0].cli_nombres_natural,
                                                idVenta: ventaResponse[0].venta_id,
                                                tipoDocumento: ventaResponse[0].venta_tipo,
                                                documentoNumero: 
                                                                `${ventaResponse[0].venta_001}-${ventaResponse[0].venta_002}-${ventaResponse[0].venta_numero}`,
                                                ventaValorTotal: ventaResponse[0].venta_total,
                                                ventaFecha: dateString
                                            }

                                            console.log('send to quee');
                                            // SEND JOB TO QUEUE BULL
                                            docElectronicoQueue.add(objSendJob,{
                                                //delay: 30000,
                                                removeOnComplete: true,
                                                removeOnFail: true,
                                                attempts: 100,
                                                backoff: {
                                                    type: 'fixed',
                                                    delay: 60000
                                                }
                                            });

                                            //DELETE XML FILE GENERATED
                                            fs.unlink(pathFile, function(){
                                                console.log("File was deleted") // Callback
                                            });

                                            //resolve(data);
                                        });

                                    })
                                });
                            },
                            function(error){
                                //reject(error);
                            }
                        );
                    });
                });
            });
    
        });

    });
}

