const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const util = require('util');
const ftp = require("basic-ftp");
const sharedFunctions = require('../../util/sharedfunctions');
const encoder = require('code-128-encoder');


exports.generatePdfByDatosXmlCompra = (datosFactura, resolve, reject) => {
  try{
    //GENERATE PDF FROM VENTA
    const path = `./files/pdf_compras`;
    let doc = new PDFDocument({margin: 50, size: 'A4'});
    
    if(!fs.existsSync(`${path}`)){
        fs.mkdir(`${path}`,{recursive: true}, (err) => {
            if (err) {
                return console.error(err);
            }
            generatePDFByDatosXmlCompra(doc,datosFactura,resolve, reject);
        });
    }else{
      generatePDFByDatosXmlCompra(doc,datosFactura, resolve, reject);
    }
  }catch(exception){
    reject({
          error: true,
          message: 'error creando directorio: ' + exception
      }
  );
  }
};

//----- METHODS FOR GENERATE PDF FROM XML IN LOAD COMPRA XML --------------------------------------------------------------------------------//
async function generatePDFByDatosXmlCompra(pdfDoc, datosFactura, resolve, reject){
  const path = `./files/pdf_compras`;
  const nameFile = `/${Date.now()}_pdf_compra.pdf`;

  await generateHeaderPDFByXmlData(pdfDoc, datosFactura);
  await generateInvoiceTablePdfByXmlData(pdfDoc,datosFactura);

  let stream = fs.createWriteStream(`${path}${nameFile}`);
  pdfDoc.pipe(stream).on('finish', function () {
      resolve({
          pathFile: path + nameFile
      });
  });

  pdfDoc.end();
}

async function generateHeaderPDFByXmlData(pdfDoc,datosFactura){

    let infoFactura = datosFactura['infoFactura'];
    let infoTributaria = datosFactura['infoTributaria'];

    let contribuyenteEspecial = 
      (infoFactura.contribuyenteEspecial != null || infoFactura.contribuyenteEspecial != undefined)? infoFactura.contribuyenteEspecial: '';
    let obligadoContabilidad = (infoFactura.obligadoContabilidad == 'SI')? true: false;
    let perteneceRegimenRimpe = (infoTributaria.contribuyenteRimpe != null || infoTributaria.contribuyenteRimpe != null)? true : false;
    let agenteDeRetencion = (infoTributaria.agenteRetencion != null || infoTributaria.agenteRetencion != null)? infoTributaria.agenteRetencion :  '';

    let pathImagen = await getImagenByRucEmp(infoTributaria.ruc);
    
    if(!pathImagen){
        pathImagen = './src/assets/logo_default_sheyla.png';
    }

    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    
    if(pathImagen){
      pdfDoc.image(pathImagen,50,50,{fit: [150, 100],align: 'center', valign: 'center'});
    }
    if(pathImagen.includes('filesTMP')){
      fs.unlink(pathImagen, function(){
        console.log('imagen, eliminada');
      });

    }

    pdfDoc.fontSize(9);
    pdfDoc.font(fontBold).text(removeAccentDiactricsFromString(infoTributaria.razonSocial), 20, 170, {width: 250});
    pdfDoc.font(fontNormal).text(`DIRECCIÓN MATRIZ: ${removeAccentDiactricsFromString(infoTributaria.dirMatriz)}`, {width: 250});

    if(!(contribuyenteEspecial === '')){
      pdfDoc.text(`Contribuyente Especial Nro: ${contribuyenteEspecial}`, 20, 230,{width: 250});
    }

    if(obligadoContabilidad){
      pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: SI`, 20, 240,{width: 250});
    }else{
      pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: NO`, 20, 240,{width: 250});
    }

    if(perteneceRegimenRimpe){
      pdfDoc.text(`CONTRIBUYENTE RÉGIMEN RIMPE`, 20, 260,{width: 250});
    }

    if(agenteDeRetencion && agenteDeRetencion.length > 0){
      pdfDoc.text(`Agente de Retención Resolucion No. ${agenteDeRetencion}`, 20, 270,{width: 250});
    }

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,250,pdfDoc.y - 150).stroke();

    pdfDoc.text(`RUC: ${infoTributaria.ruc}`, 280, 60,{width: 250});
    pdfDoc.font(fontBold).text(`FACTURA No.`, 280, 80);
    let secuencial = (infoTributaria.secuencial).toString().padStart(9,'0');
    pdfDoc.font(fontNormal).text(`${infoTributaria.estab}-${infoTributaria.ptoEmi}-${secuencial}`, 280, 95);

    pdfDoc.text(`NUMERO DE AUTORIZACION`, 280, 120);
    pdfDoc.text(`${infoTributaria.claveAcceso}`, 280, 130);

    pdfDoc.text(`FECHA Y HORA DE AUTORIZACION`, 280, 150);
    pdfDoc.text(`${datosFactura['fechaAutorizacion']}`, 280, 160);

    pdfDoc.text(`AMBIENTE: PRODUCCION`, 280, 180);
    pdfDoc.text(`EMISION: NORMAL`, 280, 200);
    pdfDoc.text(`CLAVE DE ACCESO`, 280, 220);
    pdfDoc.font('./src/assets/font/LibreBarcode39-Regular.ttf')
        .fontSize(28).text(`${infoTributaria.estab}-${infoTributaria.ptoEmi}-${secuencial}12`, 280, 230);
    pdfDoc.font(fontNormal).fontSize(9).text(`${infoTributaria.claveAcceso}`, 280, 250);

    pdfDoc.rect(pdfDoc.x - 10,50,300,pdfDoc.y - 30).stroke();

    //pdfDoc.rect(290,110,250,150).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${infoFactura.razonSocialComprador}`, 20, 300 );
    pdfDoc.text(`Identificacion: ${infoFactura.identificacionComprador}`, 20, 315 );
    pdfDoc.text(`Fecha Emision: ${infoFactura.fechaEmision}`, 20, 330);
    pdfDoc.text(`Direccion: ${infoFactura.direccionComprador ? infoFactura.direccionComprador : ''}`, 20, 345);

    pdfDoc.rect(pdfDoc.x - 10, 320 - 30, 560, 80).stroke();
}

async function generateInvoiceTablePdfByXmlData(doc, datosFactura){

  let infoFactura = datosFactura['infoFactura'];
  let listDetalle = (datosFactura['detalles'].length == undefined)? [datosFactura['detalles']] : datosFactura['detalles'];

  let totalImpuestos = [];
  if(Array.isArray(infoFactura['totalConImpuestos'])){
    totalImpuestos = infoFactura['totalConImpuestos'].totalImpuesto;
  }else{
    totalImpuestos = [infoFactura['totalConImpuestos'].totalImpuesto];
  }

  let valorSubtotal12 = 0.00;
  let valorIva12 = 0.0;
  let valorSubtotal0 = 0.00;

  let i;
  let invoiceTableTop = 390;

  if(totalImpuestos.length > 1){
    totalImpuestos = totalImpuestos[0];
  }

  for(const impuesto of totalImpuestos){
    if(impuesto['codigoPorcentaje'] == '0'){
      valorSubtotal0 += Number(impuesto['baseImponible']);
    }else{
      valorSubtotal12 += Number(impuesto['baseImponible']);
      valorIva12 += Number(impuesto['valor']);
    }
  }

  doc.font("Helvetica-Bold");
 
  const listDetail = [];
  for (i = 0; i < listDetalle.length; i++) {
    let item = listDetalle[i];

    listDetail.push({
      codigo: item.codigoPrincipal,
      descripcion: removeAccentDiactricsFromString(item.descripcion),
      cantidad: item.cantidad,
      pu: formatCurrency(item.precioUnitario, 3),
      pt: formatCurrency(item.precioTotalSinImpuesto, 3)
    });

  }

  const table = {
    headers: [ 
      {label: "Cod Principal", property:'codigo', width: 95},
      {label: "Descripcion", property:'descripcion', width: 180},
      {label: "Cant", property:'cantidad', width: 95, align: "center"},
      {label: "Precio Unitario", property:'pu', width: 95, align: "right"},
      {label: "Precio Total", property:'pt', width: 95, align: "right"}
    ],

    datas: listDetail
  };

  await doc.table(table,{
    x: doc.x - 10,
    y: invoiceTableTop
  });

  if(doc.y >= 642){
    doc.addPage();
  }

  const subtotalPosition = doc.y + 10;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal 12%",
    "",
    formatCurrency(valorSubtotal12, 2)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Subtotal 0%",
    "",
    formatCurrency(valorSubtotal0, 2)
  );

  const duePosition = paidToDatePosition + 25;

  
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Subtotal Sin Impuestos",
    "",
    formatCurrency(infoFactura.totalSinImpuestos, 2)
  );


  doc.font("Helvetica");

  const iva12Position = duePosition + 25;
  generateTableRow(
    doc,
    iva12Position,
    "",
    "",
    "IVA 12%",
    "",
    formatCurrency(valorIva12, 2)
  );

  const valorTotalPosition = iva12Position + 25;
  generateTableRow(
    doc,
    valorTotalPosition,
    "",
    "",
    "VALOR TOTAL",
    "",
    formatCurrency(infoFactura.importeTotal, 2)
  );

  doc.font("Helvetica");
  
  generateFooterTablePDFXml(doc, datosFactura, subtotalPosition);

};

async function generateFooterTablePDFXml(pdfDoc,datosFactura, yposition){

  let infoAdicional = datosFactura['infoAdicional'].campoAdicional;
  let infoFactura = datosFactura['infoFactura'];

  let fontNormal = 'Helvetica';
  let fontBold = 'Helvetica-Bold';
  pdfDoc.fontSize(9);
  
  let ypositionzero = 0.0;

  ypositionzero = yposition;
  pdfDoc.font(fontBold).text('Informacion Adicional', 20, ypositionzero , {width: 250});

  if(!(Array.isArray(datosFactura['infoAdicional']['campoAdicional']))){
    infoAdicional = [infoAdicional];
  }

  infoAdicional.forEach((elemento, index) => {
    pdfDoc.font(fontNormal).text(`${elemento['$'].nombre}: ${elemento['_']}`, {width: 250});  
  });

  pdfDoc.rect(pdfDoc.x - 10,yposition - 5,280, 90).stroke();

  let yValueNow = pdfDoc.y + 60;

  pdfDoc.lineCap('butt')
  .moveTo(230, yValueNow)
  .lineTo(230, yValueNow + 40)
  .stroke()

  row(pdfDoc, yValueNow);
  row(pdfDoc, yValueNow + 20);

  textInRowFirst(pdfDoc,'Forma de Pago', yValueNow + 10);
  textInRowFirstValor(pdfDoc,'Valor', yValueNow + 10);
  textInRowFirstValorTotal(pdfDoc,formatCurrency(infoFactura.importeTotal, 2), yValueNow + 30)
  textInRowValorFormaPago(pdfDoc,getFormaPagoByCodigo(infoFactura['pagos']['pago'].formaPago),yValueNow + 30);
}

function getFormaPagoByCodigo(codigoFormaPago){

  if(codigoFormaPago == '01'){
      return 'SIN UTILIZACION DEL SISTEMA FINANCIERO';
  }else{
      return 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO'
  }
}

function removeAccentDiactricsFromString(texto){
  let textoNormlizeAccent = texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  let textoFinal = textoNormlizeAccent.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')

  return textoFinal;
}


//--------------------------------------------------------------------------------------------------------------------------------------------------

exports.generatePdfFromVentaFactura = (valorIva, datosEmpresa,datosCliente,datosVenta,datosConfig,responseDatosEstablecimiento,
                                        resolve, reject) => {
    try{
        //GENERATE PDF FROM VENTA
        const path = `./files/pdf`;
        let doc = new PDFDocument({margin: 10, size: 'A4'});
        
        if(!fs.existsSync(`${path}`)){
            fs.mkdir(`${path}`,{recursive: true}, (err) => {
                if (err) {
                    return console.error(err);
                }                
                generatePDF(valorIva, doc,datosEmpresa,datosCliente,datosVenta,datosConfig, responseDatosEstablecimiento,resolve, reject);
            });
        }else{
            generatePDF(valorIva, doc,datosEmpresa,datosCliente,datosVenta,datosConfig, responseDatosEstablecimiento, resolve, reject);
        }

    }catch(exception){
        reject({
                error: true,
                message: 'error creando directorio: ' + exception
            }
        );
    }
}

async function generatePDF(valorIva, pdfDoc, datosEmpresa, datosCliente,datosVenta,datosConfig, responseDatosEstablecimiento,resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_venta.pdf`;

    await generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta,datosConfig, responseDatosEstablecimiento);
    await generateInvoiceTable(valorIva, pdfDoc,datosVenta, datosCliente);

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
      stream.end();
      resolve({
            pathFile: path + nameFile
      });
    });
    pdfDoc.end();
    
}

async function generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta,datosConfig, responseDatosEstablecimiento){

  let fechaAutorizacion = ''
  let isAutorizado = false;

  if(datosVenta[0].venta_electronica_observacion.includes('AUTORIZADO') && datosVenta[0].venta_electronica_estado == 2){
    try{
      isAutorizado = true;
      fechaAutorizacion = (datosVenta[0].venta_electronica_observacion.split(' - '))[2]
    }catch(exception){
      isAutorizado = false;
      fechaAutorizacion = '';
    }
  }

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

    let pathImagen = '';
    if(responseDatosEstablecimiento[0]){
      pathImagen = await getImagenByRucEmp(`${datosEmpresa[0]['EMP_RUC']}${responseDatosEstablecimiento[0].cone_establecimiento}`);
    }else{
      pathImagen = await getImagenByRucEmp(datosEmpresa[0]['EMP_RUC']);
    }

    if(!pathImagen){
        pathImagen = './src/assets/logo_default_sheyla.png';
    }

    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    
    if(pathImagen){
      pdfDoc.image(pathImagen,50,50,{fit: [150, 100],align: 'center', valign: 'center'});
    }
    if(pathImagen.includes('filesTMP')){
      fs.unlink(pathImagen, function(){
        console.log('imagen, eliminada');
      });

    }

    pdfDoc.fontSize(9);
    pdfDoc.font(fontBold).text(datosEmpresa[0]['EMP_RAZON_SOCIAL'], 20, 170, {width: 250});
    
    pdfDoc.font(fontNormal).text(`DIRECCIÓN MATRIZ: ${datosEmpresa[0]['EMP_DIRECCION_MATRIZ']}`, {width: 250});
    
    if(responseDatosEstablecimiento[0]){
      pdfDoc.text(`DIRECCIÓN SUCURSAL: ${responseDatosEstablecimiento[0]['cone_direccion_sucursal']}`, {width: 250});
    }

    if(!(contribuyenteEspecial === '')){
      pdfDoc.text(`Contribuyente Especial Nro: ${contribuyenteEspecial}`, 20, 230,{width: 250});
    }

    if(obligadoContabilidad){
      pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: SI`, 20, 240,{width: 250});
    }else{
      pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: NO`, 20, 240,{width: 250});
    }

    if(perteneceRegimenRimpe){
      pdfDoc.text(`CONTRIBUYENTE RÉGIMEN RIMPE`, 20, 260,{width: 250});
    }

    if(agenteDeRetencion && agenteDeRetencion.length > 0){
      pdfDoc.text(`Agente de Retención Resolucion No. ${agenteDeRetencion}`, 20, 270,{width: 250});
    }

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,250,pdfDoc.y - 150).stroke();

    pdfDoc.text(`RUC: ${datosEmpresa[0]['EMP_RUC']}`, 280, 60,{width: 250});
    pdfDoc.font(fontBold).text(`FACTURA No.`, 280, 80);
    let secuencial = (datosVenta[0].venta_numero).toString().padStart(9,'0');
    pdfDoc.font(fontNormal).text(`${datosVenta[0]['venta_001']}-${datosVenta[0]['venta_002']}-${secuencial}`, 280, 95);

    pdfDoc.text(`NUMERO DE AUTORIZACION`, 280, 120);
    const dateVenta = new Date(datosVenta[0].venta_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();

    let rucEmpresa = datosEmpresa[0].EMP_RUC;
    //let rucEmpresa = '1718792656001'
    let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(datosVenta[0].venta_tipo);
    let tipoAmbiente = '2';//PRODUCCION
    let serie = `${datosVenta[0]['venta_001']}${datosVenta[0]['venta_002']}`;
    let codigoNumerico = '12174565';
    let tipoEmision = 1;

    let digit48 = 
    `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;

    //let claveActivacion = modulo11(digit48);
    let claveActivacion = sharedFunctions.modulo11(digit48);

    pdfDoc.text(`${claveActivacion}`, 280, 130);

    if(isAutorizado){
      pdfDoc.text(`FECHA Y HORA DE AUTORIZACION`, 280, 150);
      pdfDoc.text(`${fechaAutorizacion}`, 280, 160);
    }

    let claveEncoder = new encoder();

    pdfDoc.text(`AMBIENTE: PRODUCCION`, 280, 180);
    pdfDoc.text(`EMISION: NORMAL`, 280, 200);
    pdfDoc.text(`CLAVE DE ACCESO`, 280, 220);
    pdfDoc.font('./src/assets/font/LibreBarcode128-Regular.ttf')
            .fontSize(27).text(claveEncoder.encode(`${claveActivacion}`) ,{
              lineGap: -7,
              align: 'justify',
            });
    pdfDoc.font(fontNormal).fontSize(9).text(`${claveActivacion}`, 280);

    pdfDoc.rect(pdfDoc.x - 10,50,300,pdfDoc.y - 25).stroke();

    //pdfDoc.rect(290,110,250,150).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${datosCliente[0]['cli_nombres_natural']}`, 20, 305 );
    pdfDoc.text(`Identificacion: ${datosCliente[0]['cli_documento_identidad']}`, 20 );
    pdfDoc.text(`Fecha Emision: ${dayVenta}/${monthVenta}/${yearVenta}`, 20);
    pdfDoc.text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20);

    pdfDoc.rect(pdfDoc.x - 10, 310 - 10, 560, 80).stroke();
}

async function generateInvoiceTable(valorIva, doc, datosVenta, datosCliente){
  let invoiceTableTop = 400;

  doc.font("Helvetica-Bold");

  const listDetail = [];
  let valorDescuentoSum = 0.0;

  for (i = 0; i < datosVenta.listVentasDetalles.length; i++) {

    let item = datosVenta.listVentasDetalles[i];

    if(item.ventad_descuento){
      valorDescuentoSum += ((Number(item.ventad_cantidad) * Number(item.ventad_vu)) * Number(item.ventad_descuento)) / 100;
    }

    listDetail.push({
        codigo: item.prod_codigo,
        descripcion: item.ventad_producto,
        cantidad: item.ventad_cantidad,
        pu: formatCurrency(item.ventad_vu, 3),
        descPercent: formatPercent(item.ventad_descuento),
        pt: formatCurrency(item.ventad_vt, 3)
    });
  }

  const table = {
    headers: [ 
      {label: "Cod Principal", property:'codigo', width: 95},
      {label: "Descripcion", property:'descripcion', width: 180},
      {label: "Cant", property:'cantidad', width: 45, align: "center"},
      {label: "Precio Unitario", property:'pu', width: 90, align: "right"},
      {label: "Desc %", property:'descPercent', width: 60, align: "right"},
      {label: "Precio Total", property:'pt', width: 90, align: "right"}
    ],

    datas: listDetail
  };

  await doc.table(table,{
    x: doc.x - 10,
    y: invoiceTableTop
  });
  

  if(doc.y >= 642){
    doc.addPage();
  }
  
  const subtotalPosition = doc.y + 10;
  generateTableRow1(
    doc,
    subtotalPosition,
    "",
    "",
    `Subtotal ${parseInt(valorIva)}%`,
    "",
    formatCurrency(datosVenta[0].venta_subtotal_12, 3)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow1(
    doc,
    paidToDatePosition,
    "",
    "",
    "Subtotal 0%",
    "",
    formatCurrency(datosVenta[0].venta_subtotal_0, 3)
  );

  const duePosition = paidToDatePosition + 25;

  let subtotalSinImpuestos = (Number(datosVenta[0].venta_subtotal_0) + Number(datosVenta[0].venta_subtotal_12)).toString();
  generateTableRow1(
    doc,
    duePosition,
    "",
    "",
    "Subtotal Sin Impuestos",
    "",
    formatCurrency(subtotalSinImpuestos, 3)
  );


  /*const icePosition = duePosition + 25;
  generateTableRow(
    doc,
    icePosition,
    "",
    "",
    "ICE",
    "",
    formatCurrency(0.00)
  );*/

  doc.font("Helvetica");

  const descuentoPosition = duePosition + 30;
  generateTableRow1(
    doc,
    descuentoPosition,
    "",
    "",
    "Descuento",
    "",
    formatCurrency(valorDescuentoSum, 3)
  );

  const iva12Position = descuentoPosition + 25;
  generateTableRow1(
    doc,
    iva12Position,
    "",
    "",
    `IVA ${parseInt(valorIva)}%`,
    "",
    formatCurrency(datosVenta[0].venta_valor_iva, 3)
  );

  const valorTotalPosition = iva12Position + 25;
  generateTableRow1(
    doc,
    valorTotalPosition,
    "",
    "",
    "VALOR TOTAL",
    "",
    formatCurrency(datosVenta[0].venta_total, 3)
  );

  doc.font("Helvetica");
  
  generateFooterTable(doc, datosCliente, datosVenta, subtotalPosition);

};

async function generateFooterTable(pdfDoc, datosCliente, datosVenta, yposition){
    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    pdfDoc.fontSize(9);
    
    let ypositionzero = yposition;
    pdfDoc.font(fontBold).text('Informacion Adicional', 20, ypositionzero , {width: 250});
    let yposition1 = ypositionzero + 10;
    //pdfDoc.font(fontNormal).text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, yposition1 , {width: 250});
    pdfDoc.font(fontNormal).text(`Direccion: ${datosCliente[0]['cli_direccion']}`, {width: 250});
    let yposition2 = yposition1 + 20;
    pdfDoc.text(`FORMA PAGO: ${datosVenta[0]['venta_forma_pago']}`, 20, yposition2 , {width: 250});
    let yposition3 = yposition2 + 10;
    //pdfDoc.text(`RESPONSABLE: ${datosVenta[0]['usu_nombres']}`, 20, yposition3 , {width: 250});
    pdfDoc.text(`RESPONSABLE: ${datosVenta[0]['usu_nombres']}`, {width: 250});
    let yposition4 = yposition3 + 10;
    //pdfDoc.text(`EMAIL: ${datosCliente[0]['cli_email']}`, 20, yposition4, {width: 250});
    pdfDoc.text(`EMAIL: ${datosCliente[0]['cli_email']}`, {width: 250});
    let yposition5 = yposition4 + 10;
    //pdfDoc.text(`TELEFONO: ${datosCliente[0]['cli_teleono']}`, 20, yposition5 , {width: 250});
    pdfDoc.text(`TELEFONO: ${datosCliente[0]['cli_teleono']}`, {width: 250});
    let yposition6 = yposition5 + 10;
    //pdfDoc.text(`CELULAR: ${datosCliente[0]['cli_celular']}`, 20, yposition6, {width: 250});
    pdfDoc.text(`CELULAR: ${datosCliente[0]['cli_celular']}`, {width: 250});

    if(datosVenta[0]['venta_observaciones'] && datosVenta[0]['venta_observaciones'].length > 0){
      pdfDoc.text(`Obs: ${datosVenta[0]['venta_observaciones']}`, {width: 250});
    }
    pdfDoc.rect(pdfDoc.x - 10,yposition - 5,280, 130).stroke();

    pdfDoc.lineCap('butt')
    .moveTo(210, yposition6 + 60)
    .lineTo(210, yposition6 + 100)
    .stroke()
  
    row(pdfDoc, yposition6 + 60);
    row(pdfDoc, yposition6 + 80);

    textInRowFirst(pdfDoc,'Forma de Pago', yposition6 + 70);
    textInRowFirstValor(pdfDoc,'Valor', yposition6 + 70);
    textInRowFirstValorTotal(pdfDoc,formatCurrency(datosVenta[0].venta_total, 2), yposition6 + 90)
    textInRowValorFormaPago(pdfDoc,sharedFunctions.getFormaDePagoRide(datosVenta[0].venta_forma_pago),yposition6 + 90);
    
    //textInRowFirst(pdfDoc, yposition6 + 60);
}

function row(doc, heigth) {
    doc.lineJoin('miter')
      .rect(10, heigth, 280, 20)
      .stroke()
    return doc
}

function textInRowFirst(doc, text, heigth) {
  doc.y = heigth;
  doc.x = 30;
  doc.fillColor('black')
  doc.text(text, {
    paragraphGap: 5,
    indent: 5,
    align: 'justify',
    columns: 1,
  });
  return doc
}
function textInRowFirstValor(doc, text, heigth) {
  doc.y = heigth;
  doc.x = 200 + 25;
  doc.fillColor('black')
  doc.text(text, {
    paragraphGap: 5,
    indent: 5,
    align: 'justify',
    columns: 1,
  });
  return doc
}

function textInRowFirstValorTotal(doc, text, heigth) {
  doc.fontSize(8);
  doc.y = heigth;
  doc.x = 225;
  doc.fillColor('black')
  doc.text(text, {
    paragraphGap: 5,
    indent: 5,
    align: 'justify',
    columns: 1,
  });
  return doc
}

function textInRowValorFormaPago(doc, text, heigth) {
  doc.y = heigth;
  doc.x = 10;
  doc.fillColor('black')
  doc.text(text, {
    paragraphGap: 5,
    indent: 5,
    align: 'justify',
    columns: 1,
  });
  return doc
}

function generateTableRow(
    doc,
    y,
    item,
    description,
    unitCost,
    quantity,
    lineTotal
  ) {
    doc
      .fontSize(9)
      .text(item, 20, y)
      .text(description, 150, y,{ width: 200})
      .text(unitCost, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(lineTotal, doc.page.width - 115, y, { width: 90, align: "right" });

}

function generateTableRow1(
  doc,
  y,
  item,
  description,
  unitCost,
  quantity,
  lineTotal
) {

  doc.fontSize(9)
      .text(item, 20, y)
      .text(description, 150, y,{ width: 200})
      .text(unitCost, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(lineTotal, doc.page.width - 115, y, { width: 90, align: "right" });
}


function generateHr(doc, y) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(20, y )
      .lineTo(550, y )
      .stroke();
}
 
function formatCurrency(cents, decimals) {
  return "$" + Number((cents)).toFixed(decimals);
}

function formatPercent(cents) {
  return "" + Number((cents)).toFixed(2);
}

async function getImagenByRucEmp(rucEmp){

  try{
    let pathRemoteFile = `logos/${rucEmp}`
    let path = `./filesTMP/${rucEmp}`;

    // Convert callback based methods to promise
    // based methods
    const makeDir = util.promisify(fs.mkdir);

    await makeDir(`${path}`,{recursive: true});

    //CONNECT TO FTP SERVER
    const client = new ftp.Client();
    try{
        await  client.access({
            host: process.env.hostFtpFirmas,
            user: process.env.userFtpFirmas,
            password: process.env.passFtpFirmas
        });
        
        //const fileNameWithoutExt = pathRemoteFile.split('.')[0].split('/')[1];
        const listFilesInDir = await client.list('logos');
        let extensionRemoteFile = 'png';
        
        listFilesInDir.forEach(function(file){
            if(file.name.split('.')[0] === rucEmp){
                extensionRemoteFile = file.name.split('.').pop();
                return;
            }
        });
        
        let response = await client.downloadTo(`${path}/${rucEmp}.${extensionRemoteFile}`, `${pathRemoteFile}.${extensionRemoteFile}`);
        
        client.close();
        return (response.code == 505) ? '' : `${path}/${rucEmp}.${extensionRemoteFile}`;
        
    }catch(ex){
      console.log('dentro de error ');
        client.close();
        //console.log(ex);
        return '';
    }
  }catch(error){
    console.log('dentro de error ');
    return '';
  }

}
