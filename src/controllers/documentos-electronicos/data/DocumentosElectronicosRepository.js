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
    return new Promise((resolve, reject) => {
        try{    
            // GET LISTA DE DOCUMENTOS 
            // Y ENVIARLOS EN UN FOR PARA SU VALIDACION
            for(const documento of listDoc){
                const {idEmp, id,identificacion,VENTA_TIPO, estado} = documento;
                
                if(estado == 0){
                    prepareAndSendDocumentoElectronicoAsync(idEmp, id,identificacion,VENTA_TIPO, nombreBd);
                }else{
                    queryStateDocumentoElectronicoError(idEmp, id,identificacion,VENTA_TIPO,nombreBd);
                }
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
            AND CONCAT(venta_001,'-',venta_002,'-',venta_numero) LIKE ? AND venta_anulado=0 `;

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
            
            const sqlQueryDocumentosElectronicos = `SELECT VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado 
            FROM ${nombreBd}.ventas,${nombreBd}.clientes WHERE venta_empresa_id = ? 
            AND venta_cliente_id=cli_id AND venta_electronica_estado != 2 AND venta_anulado= 0 AND VENTA_TIPO = ?`;

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


//------------------------------------------------------------------------------------------------------------------------

function generateXmlDocumentoElectronicoVenta(datosCliente, datosVenta, listVentaDetalle,datosEmpresa, datosConfig,responseDatosEstablecimiento){

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
                        if(element.con_valor.trim().toUpperCase() != 'NO'){
                            contribuyenteEspecial = element.con_valor;
                        }
                    }
                    if(element.con_nombre_config == 'FAC_ELECTRONICA_OBLIGADO_LLEVAR_CONTABILIDAD'){
                        obligadoContabilidad = element.con_valor === '1';
                    }
                    if(element.con_nombre_config == 'FAC_ELECTRONICA_AGENTE_RETENCION'){
                        if(element.con_valor.trim().toUpperCase() != 'NO'){
                            agenteDeRetencion = element.con_valor;
                        }
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
                                    .ele('razonSocial',removeAccentDiactricsFromString(datosEmpresa.EMP_RAZON_SOCIAL)).up();
            if(responseDatosEstablecimiento[0]){
                rootElement = rootElement.ele('nombreComercial', removeAccentDiactricsFromString(responseDatosEstablecimiento[0].cone_nombre_establecimiento)).up();
            }
            //rootElement.ele('nombreComercial','Prueba 2').up()
            rootElement = rootElement.ele('ruc',rucEmpresa).up()
                                    .ele('claveAcceso',claveActivacion).up().ele('codDoc',codigoDocmento).up()
                                    .ele('estab',datosVenta.venta_001).up().ele('ptoEmi',datosVenta.venta_002).up().ele('secuencial',secuencial).up()
                                   .ele('dirMatriz',removeAccentDiactricsFromString(direccionMatriz)).up();

            if(perteneceRegimenRimpe){
                rootElement = rootElement.ele('contribuyenteRimpe','CONTRIBUYENTE REGIMEN RIMPE').up();
            }
            if(agenteDeRetencion && agenteDeRetencion.length > 0 && agenteDeRetencion.toUpperCase() != 'NO'){
                rootElement = rootElement.ele('agenteRetencion', agenteDeRetencion).up();
            }

            rootElement = rootElement.up();

            let parcialElement1 = rootElement.ele('infoFactura').ele('fechaEmision',`${dayVenta}/${monthVenta}/${yearVenta}`).up();

            if(responseDatosEstablecimiento[0]){
                parcialElement1.ele('dirEstablecimiento',responseDatosEstablecimiento[0].cone_direccion_sucursal).up();
            }

            if(!(contribuyenteEspecial === '')){
                parcialElement1.ele('contribuyenteEspecial',contribuyenteEspecial).up();
            }
            if(obligadoContabilidad){
                parcialElement1.ele('obligadoContabilidad','SI').up();
            }else{
                parcialElement1.ele('obligadoContabilidad','NO').up();
            }
                        
            parcialElement1.ele('tipoIdentificacionComprador',tipoIdentificacionComprador).up()
                        .ele('razonSocialComprador',removeAccentDiactricsFromString(datosCliente.cli_nombres_natural)).up().ele('identificacionComprador',identificacionComprador).up()
            if(showDireccionComprador){
                            parcialElement1.ele('direccionComprador',removeAccentDiactricsFromString(datosCliente.cli_direccion)).up()
            }
            let totalImpuestosEle = parcialElement1.ele('totalSinImpuestos',totalSinImpuestos).up().ele('totalDescuento',totalDescuento.toFixed(2)).up()
                        .ele('totalConImpuestos')
            
            let baseImponibleIva12 = 0.0;
            let valorIva12BI = 0.0;
            let baseImponibleIva0 = 0.0;
            
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

                    if(listVentaDetalle[i].ventad_iva == '12.00'){
                        baseImponibleIva12 += valorTotal;
                        valorIva12BI += valorIva;
                    }else{
                        baseImponibleIva0 += valorTotal;
                    }
            }

            if(baseImponibleIva12 > 0){
                totalImpuestosEle.ele('totalImpuesto').ele('codigo','2').up().ele('codigoPorcentaje','2').up()
                            .ele('baseImponible',(baseImponibleIva12.toFixed(2)).toString()).up().ele('valor',valorIva12BI.toFixed(2)).up().up().up()
            }

            if(baseImponibleIva0 > 0){
                totalImpuestosEle.ele('totalImpuesto').ele('codigo','2').up().ele('codigoPorcentaje','0').up()
                            .ele('baseImponible',(baseImponibleIva0.toFixed(2)).toString()).up().ele('valor','0.00').up().up().up()
            }

            parcialElement1.ele('propina','0.00').up()
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

                detallesNode = detallesNode.ele('detalle').ele('codigoPrincipal',removeAccentDiactricsFromString(listVentaDetalle[i].prod_codigo)).up()
                .ele('codigoAuxiliar',listVentaDetalle[i].prod_codigo).up().ele('descripcion',removeAccentDiactricsFromString(listVentaDetalle[i].prod_nombre)).up()
                .ele('cantidad',Number(listVentaDetalle[i].ventad_cantidad).toFixed(2)).up().ele('precioUnitario',Number(listVentaDetalle[i].ventad_vu).toFixed(2)).up()

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
         
            rootElement = rootElement.ele('infoAdicional');
            if(datosCliente.cli_direccion.trim().length > 0){
                rootElement.ele('campoAdicional',{'nombre':'DIRECCION'},removeAccentDiactricsFromString(datosCliente.cli_direccion)).up();
            }
            rootElement.ele('campoAdicional',{'nombre':'FORMA DE PAGO'},removeAccentDiactricsFromString(datosVenta.venta_forma_pago)).up()
            .ele('campoAdicional',{'nombre':'RESPONSABLE'}, removeAccentDiactricsFromString(datosVenta.usu_nombres)).up()


            if(datosCliente.cli_email && datosCliente.cli_email.trim().length > 0 && datosCliente.cli_email !== ' '){
                let firstEmailCliente = '';
                if(datosCliente.cli_email.includes(',')){
                    firstEmailCliente = datosCliente.cli_email.split(',')[0];
                }else{
                    firstEmailCliente = datosCliente.cli_email;
                }

                if(firstEmailCliente != ''){
                    rootElement = rootElement.ele('campoAdicional',{'nombre':'EMAIL'},datosCliente.cli_email).up()
                }
            }


            if(datosCliente.cli_teleono && datosCliente.cli_teleono.trim().length > 0){
                rootElement.ele('campoAdicional',{'nombre':'TELEFONOS'},datosCliente.cli_teleono).up();
            }
            
            if(datosVenta.venta_observaciones && datosVenta.venta_observaciones.trim().length > 0){
                rootElement.ele('campoAdicional',{'nombre':'Observacion'},removeAccentDiactricsFromString(datosVenta.venta_observaciones)).up();
            }

            const xmlFinal = rootElement.end({pretty: true});

            // SAVE XML FILE IN FOLDER SERVER
            const path = `./files/${datosEmpresa.EMP_ID}`;
            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        return console.error(err);
                    }
    
                    fs.writeFile(`${path}/${datosVenta.venta_tipo}${secuencial}.xml`, xmlFinal, function(error){
                        if(error){
                            reject({
                                isSucess: false,
                                error: 'error creando xml documento venta, reintente'
                            });
                            return;
                        }

                        resolve({
                            pathFile: `${path}/${datosVenta.venta_tipo}${secuencial}.xml`,
                            claveAct: claveActivacion
                        });
                        
                    })
                });
            }else{
                fs.writeFile(`${path}/${datosVenta.venta_tipo}${secuencial}.xml`, xmlFinal, function(error){
                    if(error){
                        reject({
                            isSucess: false,
                            error: 'error creando xml documento venta, reintente'
                        });
                        return;
                    }

                    resolve({
                        pathFile: `${path}/${datosVenta.venta_tipo}${secuencial}.xml`,
                        claveAct: claveActivacion
                    });
                });
            }

        }catch(exception){
            console.log('inside error');
            console.log(exception);
            reject({
                isSucess: false,
                error: 'error creando xml documento venta, reintente'
            });
        }
    });

}

function removeAccentDiactricsFromString(texto){
    let textoNormlizeAccent = texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    let textoFinal = textoNormlizeAccent.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')

    return textoFinal;
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
        
        const querySelectConfigFactElectr = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
        const sqlQuerySelectEmp = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ? LIMIT 1`;
        const sqlQuerySelectClienteByIdEmp = `SELECT * FROM ${nombreBd}.clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectVentaByIdEmp = `SELECT ventas.*, usu_nombres FROM ${nombreBd}.ventas, ${nombreBd}.usuarios WHERE venta_usu_id = usu_id AND venta_id = ? AND venta_empresa_id = ? LIMIT 1`;
        const sqlQuerySelectVentaDetallesByIdVenta = `SELECT ventas_detalles.*, prod_codigo FROM ${nombreBd}.ventas_detalles, ${nombreBd}.productos WHERE 
                                                            ventad_prod_id = prod_id AND ventad_venta_id = ? `;
        const sqlQuerySelectDatosEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_establecimiento = ? LIMIT 1`;

        try{
            const responseDatosConfig = await pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%']);
            const responseDatosEmpresa = await pool.query(sqlQuerySelectEmp,[idEmp]);
            const responseDatosCliente = await pool.query(sqlQuerySelectClienteByIdEmp, [identificacionClienteProv,idEmp]);
            const responseDatosVenta = await pool.query(sqlQuerySelectVentaByIdEmp, [idVentaCompra,idEmp]);
            const responseDatosVentaDetalles = await pool.query(sqlQuerySelectVentaDetallesByIdVenta, [idVentaCompra]);
            const responseDatosEstablecimiento = await pool.query(sqlQuerySelectDatosEstablecimiento, [idEmp, responseDatosVenta[0][0].venta_001]);

            // GENERATE PDF WHIT DATA                            
            responseDatosVenta[0]['listVentasDetalles'] = responseDatosVentaDetalles[0];
            
            const pathPdfGeneratedProm = pdfGenerator.generatePdfFromVenta(responseDatosEmpresa[0],responseDatosCliente[0],
                                                responseDatosVenta[0], isPdfNormal, responseDatosConfig[0], responseDatosEstablecimiento[0]);

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


//--------------------------------------------------------------------------------------------------------------------------------
async function prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra,identificacion,tipo,nombreBd){
    console.log('inside send document');
    // VERIFICAR SI ES UNA COMPRA O VENTA POR QUE DE ESO 
    // CONSULTAR Y OBTENER LOS DATOS DE - DATOS CLIENTE O PROVEEDOR
    // - DATOS DE LA VENTA - DATOS DETALLE DE LA VENTA O COMPRA
    // CON ESOS DATOS GENERAR EL XML Y POR AHORA GUARDARLO EN UNA CARPETA EN EL SERVER
    // OBTENER LOS DATOS DEL EMISOR (LA EMPRESA) QUE ENVIA EL DOCUMENTO ELECTRONICO
    const querySelectConfigFactElectr = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
    const querySelectCliente = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
    const querySelectVenta = `SELECT ventas.*, usuarios.usu_nombres FROM ${nombreBd}.ventas, ${nombreBd}.usuarios WHERE venta_usu_id = usu_id AND venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
    const querySelectVentasDetalles = `SELECT ventas_detalles.* ,productos.prod_codigo, productos.prod_nombre 
                                        FROM ${nombreBd}.ventas_detalles, ${nombreBd}.productos WHERE 
                                        ventad_prod_id = prod_id AND ventad_venta_id = ?`;
    const queryDatosEmpresaById = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ?`;
    const sqlQuerySelectDatosEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_establecimiento = ? LIMIT 1`;

    try{
        const responseDatosConfig = await pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%']);
        const responseDatosEmpresa = await pool.query(queryDatosEmpresaById,[idEmp]);
        const responseDatosCliente = await pool.query(querySelectCliente, [idEmp, identificacion]);
        const responseDatosVenta = await pool.query(querySelectVenta, [idEmp, idVentaCompra]);
        const responseDatosVentaDetalles = await pool.query(querySelectVentasDetalles, [idVentaCompra]);
        const responseDatosEstablecimiento = await pool.query(sqlQuerySelectDatosEstablecimiento, [idEmp, responseDatosVenta[0].venta_001]);

        const valorGenerateXmlResponse = generateXmlDocumentoElectronicoVenta(responseDatosCliente[0][0],responseDatosVenta[0][0],responseDatosVentaDetalles[0],
                                                                                responseDatosEmpresa[0][0],responseDatosConfig[0], responseDatosEstablecimiento[0]);
        valorGenerateXmlResponse.then(
            async function(data){
                const pathFile = data.pathFile;
                const claveActivacion = data.claveAct;

                //INSERT XML FILE IN DB BLOB
                const sqlQuerySelectEmpresa = `SELECT empresa_id FROM empresas WHERE empresa_ruc = ? LIMIT 1`;
                const sqlQueryInsertXmlBlob = `INSERT INTO autorizaciones (auto_id_empresa,auto_clave_acceso, auto_xml) VALUES (?,?,?)`;
                const sqlQueryExistXmlInsert = `SELECT * FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
                const queryPlanEnviados = `SELECT EMPRESA_WEB_PLAN_CANTIDAD, EMPRESA_WEB_PLAN_ENVIADOS,
                                            CASE WHEN EMPRESA_WEB_PLAN_ENVIADOS >= EMPRESA_WEB_PLAN_CANTIDAD THEN 0 
                                            ELSE 1 END AS isSucess
                                            FROM empresas WHERE EMPRESA_RUC = ?`;

                const responseSelectEmpresaAutorizacion = await poolEFactra.query(sqlQuerySelectEmpresa,[responseDatosEmpresa[0][0].EMP_RUC]);
                const responsePlanEnviados = await poolEFactra.query(queryPlanEnviados, [responseDatosEmpresa[0][0].EMP_RUC]);

                if(responsePlanEnviados[0][0].isSucess == 1){
                    const responseXmlExist = await poolEFactra.query(sqlQueryExistXmlInsert,[claveActivacion]);
                    // SI EXISTE XML EN LA TABLA AUTORIZACIONES ENTONCES HACER OTRAS VALIDACIONES, CASO CONTRARIO SEGUIR CON LA INSERCION
                    if(Object.entries(responseXmlExist[0]).length > 0){
                        // VERIFICAR SI ES UN ERROR O YA SE AUTORIZO PARA REALIZAR EL PROCESO CORRESPONDIENTE 
                        // SE OBTENIENE EL ESTADO DE LA FACTRUA EN LA TABLA AUTORIZACION
                        // SE VERIFICA SI YA SE AUTORIZO O SIGUE EN ERROR
                        const queryUpdateFacAutorizacion = `DELETE FROM autorizaciones WHERE auto_clave_acceso = ?`;
                        const queryUpdateVentaEstado = `UPDATE ${nombreBd}.ventas SET venta_electronica_estado = ?, venta_electronica_observacion = ? WHERE venta_id = ?`;

                        if(responseXmlExist[0][0].auto_estado == 2){

                            await poolEFactra.query(queryUpdateFacAutorizacion,[claveActivacion]);
                            await pool.query(queryUpdateVentaEstado,[0,'En Espera...',idVentaCompra]);

                            //DELETE XML FILE GENERATED
                            fs.unlink(pathFile, function(){
                                console.log("File was deleted")
                            });

                            prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra, identificacion, tipo, nombreBd);

                        }else if(responseXmlExist[0][0].auto_estado == 1){

                            // YA SE AUTORIZO EL DOCUMENTO DEBO ACTUALIZAR ESE ESTADO EN LA VENTA
                            await pool.query(queryUpdateVentaEstado,[2,responseXmlExist[0][0].auto_mensaje,idVentaCompra]);
                            //DELETE XML FILE GENERATED
                            fs.unlink(pathFile, function(){
                                console.log("File was deleted")
                            });

                            sendDataToWorkerAutorizacion(claveActivacion, responseSelectEmpresaAutorizacion[0][0].empresa_id, responseDatosEmpresa[0][0],
                                                        responseDatosCliente[0][0], responseDatosVenta[0][0], nombreBd);

                        }else{
                            //DELETE XML FILE GENERATED
                            fs.unlink(pathFile, function(){
                                console.log("File was deleted")
                            });
                        }

                    }else{
                        // READ XML FILE AS STRING
                        let stream  = fs.createReadStream(pathFile);
                        stream.setEncoding('utf-8');
                        let xmlString = '';

                        stream.on('data',function(chunk){
                            xmlString += chunk;
                        });

                        stream.on('end', async function() {
                            let str = xmlString.replace(/[\n\r\t]+/g, '');
                            
                            await poolEFactra.query(sqlQueryInsertXmlBlob,[responseSelectEmpresaAutorizacion[0][0].empresa_id,claveActivacion, str]);
                            //DELETE XML FILE GENERATED
                            fs.unlink(pathFile, function(){
                                console.log("File was deleted")
                            });

                            sendDataToWorkerAutorizacion(claveActivacion, responseSelectEmpresaAutorizacion[0][0].empresa_id, responseDatosEmpresa[0][0],
                                                        responseDatosCliente[0][0], responseDatosVenta[0][0], nombreBd);

                        });
                    }
                }
            },
            function(error){
                //reject(error);
            }
        );
    }catch(exception){
        console.log(exception);
    }

}


async function queryStateDocumentoElectronicoError(idEmp, idVentaCompra, identificacion, tipo, nombreBd){
   
    const querySelectVenta = `SELECT ventas.*, usuarios.usu_nombres FROM ${nombreBd}.ventas, ${nombreBd}.usuarios WHERE venta_usu_id = usu_id AND venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
    const queryDatosEmpresaById = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ?`;
    const querySelectCliente = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
    
    let empResponse = await pool.query(queryDatosEmpresaById,[idEmp]);
    let clienteResponse = await pool.query(querySelectCliente, [idEmp, identificacion]);

    const datosCliente = clienteResponse[0][0];
    const datosEmpresa = empResponse[0][0];

    let ventaResponse = await pool.query(querySelectVenta, [idEmp, idVentaCompra]);

    const datosVenta = ventaResponse[0][0];

    const dateVenta = new Date(datosVenta.venta_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();

    let rucEmpresa = datosEmpresa.EMP_RUC;
    let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(datosVenta.venta_tipo);
    let tipoAmbiente = '2';//PRODUCCION //PRUEBAS '1    '
    let serie = `${datosVenta.venta_001}${datosVenta.venta_002}`;
    let codigoNumerico = '12174565';
    let secuencial = (datosVenta.venta_numero).toString().padStart(9,'0');
    let tipoEmision = 1;
        
    let digit48 = 
                `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
                
    let claveActivacion = sharedFunctions.modulo11(digit48);
        
    //query in table Autorizaciones for state with clave
    const sqlQuerySelectAutoFacState = `SELECT auto_estado, auto_mensaje,auto_id_empresa FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
    const queryPlanEnviados = `SELECT EMPRESA_WEB_PLAN_CANTIDAD, EMPRESA_WEB_PLAN_ENVIADOS,
                                CASE WHEN EMPRESA_WEB_PLAN_ENVIADOS >= EMPRESA_WEB_PLAN_CANTIDAD THEN 0 
                                ELSE 1 END AS isSucess
                                FROM empresas WHERE EMPRESA_RUC = ?`;

    let results = await poolEFactra.query(sqlQuerySelectAutoFacState,[claveActivacion]);
    let resultPlan = await  poolEFactra.query(queryPlanEnviados, [rucEmpresa]);

    if(resultPlan[0][0].isSucess == 1){
        if(results[0].length <= 0){
            // no existe en la tabla autorizaciones
            //enviar otra vez el xml al servicio
            prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra, identificacion, tipo, nombreBd);
            return{estado:'ok'};
        }else{
            // SE OBTENIENE EL ESTADO DE LA FACTURA EN LA TABLA AUTORIZACION
            // SE VERIFICA SI YA SE AUTORIZO O SIGUE EN ERROR
            const queryUpdateFacAutorizacion = `DELETE FROM autorizaciones WHERE auto_clave_acceso = ?`;
            const queryUpdateVentaEstado = `UPDATE ${nombreBd}.ventas SET venta_electronica_estado = ?, venta_electronica_observacion = ? WHERE venta_id = ?`;

            //2.-Error
            if(results[0][0].auto_estado == 2){
                await poolEFactra.query(queryUpdateFacAutorizacion,[claveActivacion]);                     
                await pool.query(queryUpdateVentaEstado,[0,'En Espera...',idVentaCompra]);
                            
                prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra, identificacion,tipo, nombreBd);

                return{estado:'ok'}
            }else if(results[0][0].auto_estado == 1){
                // YA SE AUTORIZO EL DOCUMENTO DEBO ACTUALIZAR ESE ESTADO EN LA VENTA
                await pool.query(queryUpdateVentaEstado,[2,results[0][0].auto_mensaje,idVentaCompra]);
                
                //ENVIAR A  LA COLA PARA QUE GUARDE LOS DATOS DEL XML Y ENVIE POR CORREO
                sendDataToWorkerAutorizacion(claveActivacion,results[0][0].auto_id_empresa,datosEmpresa,
                                                datosCliente,datosVenta,nombreBd)
                return{estado:'ok'}
            }else if(results[0][0].auto_estado == 0){
                await pool.query(queryUpdateVentaEstado,[0,'En Espera...',idVentaCompra]);
                return{estado:'ok'}
            }
        }
    }else{
        return {
            isSucess: false, 
            message:'no cuenta con documentos para autorizar',
            isAllowAutorizar: false
        };
    }
   
}

function sendDataToWorkerAutorizacion(claveActivacion, empresaId, datosEmpresa, datosCliente, datosVenta, nombreBd){

    const dateVenta = new Date(datosVenta.venta_fecha_hora);
        
    const dateString = '' + dateVenta.getFullYear() + '-' + ('0' + (dateVenta.getMonth()+1)).slice(-2) + 
                    '-' + ('0' + dateVenta.getDate()).slice(-2);
                                                                
                                                                                    
    const objSendJob = {
        claveAct: claveActivacion,
        empresaId: empresaId,
        empresaIdLocal: datosEmpresa.EMP_ID,
        rucEmpresa: datosEmpresa.EMP_RUC,
        nombreEmpresa: datosEmpresa.EMP_NOMBRE,
        ciRucCliente: datosCliente.cli_documento_identidad,
        emailCliente: datosCliente.cli_email,
        nombreCliente:  datosCliente.cli_nombres_natural,
        idVenta: datosVenta.venta_id,
        tipoDocumento: datosVenta.venta_tipo,
        documentoNumero: 
                    `${datosVenta.venta_001}-${datosVenta.venta_002}-${datosVenta.venta_numero}`,
        ventaValorTotal: datosVenta.venta_total,
        ventaFecha: dateString,
        nombreBd: nombreBd
    }
    console.log('send data to worker');
    // SEND JOB TO QUEUE BULL
    docElectronicoQueue.add(objSendJob,{
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 100,
        backoff: {
            type: 'fixed',
            delay: 60000
        }
    });
}
