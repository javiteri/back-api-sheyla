const PDFDocument = require('pdfkit');
const fs = require('fs');
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

    pdfDoc.rect(pdfDoc.x - 10,50,300,pdfDoc.y - 20).stroke();

    //pdfDoc.rect(290,110,250,150).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${infoFactura.razonSocialComprador}`, 20, 315 );
    pdfDoc.text(`Identificacion: ${infoFactura.identificacionComprador}`, 20, 330 );
    pdfDoc.text(`Fecha Emision: ${infoFactura.fechaEmision}`, 20, 345);
    pdfDoc.text(`Direccion: ${infoFactura.direccionComprador}`, 20, 360);

    pdfDoc.rect(pdfDoc.x - 10, 320 - 10, 560, 80).stroke();
}

async function generateInvoiceTablePdfByXmlData(doc, datosFactura){

  let infoAdicional = datosFactura['infoAdicional'];
  let infoFactura = datosFactura['infoFactura'];
  let listDetalle = (datosFactura['detalles'].length == undefined)? [datosFactura['detalles']] : datosFactura['detalles'];

  let totalImpuestos = infoFactura['totalConImpuestos'].totalImpuesto;
  let valorSubtotal12 = '0.0';
  let valorIva12 = '0.0';
  let valorSubtotal0 = '';

  let i;
  let invoiceTableTop = 420;

  doc.font("Helvetica-Bold");
 
  generateTableRow(
    doc,
    invoiceTableTop,
    "Cod Principal",
    "Description",
    "Cant",
    "Precio Unitario",
    "Precio Total"
  );

  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  let index = 0;
  let position = 0;
  for (i = 0; i < listDetalle.length; i++) {

    const item = listDetalle[i];
    position = invoiceTableTop + (index + 1) * 30;

    index++;

    if(position > 800){
        index = 0
        invoiceTableTop = 5;
        position = invoiceTableTop + (index + 1) * 30;
        index++;
        doc.addPage();
    }

    generateTableRow(
        doc,
        position,
        item.codigoPrincipal,
        removeAccentDiactricsFromString(item.descripcion),
        item.cantidad,
        formatCurrency(item.precioUnitario),
        formatCurrency(item.precioTotalSinImpuesto)
      );

    
    generateHr(doc, position + 20);
  }

  if(position >= 600){
    index = 0
    invoiceTableTop = 5;
    doc.addPage();
  }

  let listTotalImpuestos = (totalImpuestos.length == undefined)? [totalImpuestos]: totalImpuestos;

  listTotalImpuestos.forEach((elemento) => {
    if(elemento.codigoPorcentaje == "2"){
      valorSubtotal12 = elemento.baseImponible;
      valorIva12 = elemento.valor;
    }else{
      valorSubtotal0 = elemento.baseImponible;
    }
  });


  const subtotalPosition = invoiceTableTop + (index + 1) * 30;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal 12%",
    "",
    formatCurrency(valorSubtotal12)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Subtotal 0%",
    "",
    formatCurrency(valorSubtotal0)
  );

  const duePosition = paidToDatePosition + 25;

  
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Subtotal Sin Impuestos",
    "",
    formatCurrency(infoFactura.totalSinImpuestos)
  );


  const icePosition = duePosition + 25;
  generateTableRow(
    doc,
    icePosition,
    "",
    "",
    "ICE",
    "",
    formatCurrency(0.00)
  );

  doc.font("Helvetica");

  const iva12Position = icePosition + 25;
  generateTableRow(
    doc,
    iva12Position,
    "",
    "",
    "IVA 12%",
    "",
    formatCurrency(valorIva12)
  );

  const valorTotalPosition = iva12Position + 25;
  generateTableRow(
    doc,
    valorTotalPosition,
    "",
    "",
    "VALOR TOTAL",
    "",
    formatCurrency(infoFactura.importeTotal)
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

  ypositionzero = yposition + 20;
  pdfDoc.font(fontBold).text('Informacion Adicional', 20, ypositionzero , {width: 250});

  infoAdicional.forEach((elemento, index) => {
    pdfDoc.font(fontNormal).text(`${elemento['$'].nombre}: ${elemento['_']}`, {width: 250});  

  })

  pdfDoc.rect(pdfDoc.x - 10,yposition + 30,280, 100).stroke();

  let yValueNow = pdfDoc.y + 60;

  pdfDoc.lineCap('butt')
  .moveTo(230, yValueNow)
  .lineTo(230, yValueNow + 40)
  .stroke()

  row(pdfDoc, yValueNow);
  row(pdfDoc, yValueNow + 20);

  textInRowFirst(pdfDoc,'Forma de Pago', yValueNow + 10);
  textInRowFirstValor(pdfDoc,'Valor', yValueNow + 10);
  textInRowFirstValorTotal(pdfDoc,formatCurrency(infoFactura.importeTotal), yValueNow + 30)
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

exports.generatePdfFromVentaFactura = (datosEmpresa,datosCliente,datosVenta,datosConfig,
                                        resolve, reject) => {
    try{
        //GENERATE PDF FROM VENTA
        const path = `./files/pdf`;
        let doc = new PDFDocument({margin: 50, size: 'A4'});
        
        if(!fs.existsSync(`${path}`)){
            fs.mkdir(`${path}`,{recursive: true}, (err) => {
                if (err) {
                    return console.error(err);
                }
                generatePDF(doc,datosEmpresa,datosCliente,datosVenta,datosConfig, resolve, reject);
            });
        }else{
            generatePDF(doc,datosEmpresa,datosCliente,datosVenta,datosConfig, resolve, reject);
        }

    }catch(exception){
        reject(
            {
                error: true,
                message: 'error creando directorio: ' + exception
            }
        );
    }
}

async function generatePDF(pdfDoc, datosEmpresa, datosCliente,datosVenta,datosConfig, resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_venta.pdf`;

    await generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta,datosConfig);
    await generateInvoiceTable(pdfDoc,datosVenta, datosCliente);

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
        resolve({
            pathFile: path + nameFile
        });
    });

    pdfDoc.end();
}

async function generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta,datosConfig){

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
              if(element.con_valor.toUpperCase() != 'NO'){
                contribuyenteEspecial = element.con_valor;
              }
            }
            if(element.con_nombre_config == 'FAC_ELECTRONICA_OBLIGADO_LLEVAR_CONTABILIDAD'){
                obligadoContabilidad = element.con_valor === '1';
            }
            if(element.con_nombre_config == 'FAC_ELECTRONICA_AGENTE_RETENCION'){
              if(element.con_valor.toUpperCase() != 'NO'){
                agenteDeRetencion = element.con_valor;
              }
            }
            if(element.con_nombre_config == 'FAC_ELECTRONICA_PERTENECE_REGIMEN_RIMPE'){
                perteneceRegimenRimpe = element.con_valor === '1';
            }
        });
    }

    let pathImagen = await getImagenByRucEmp(datosEmpresa[0]['EMP_RUC']);
    
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
    
    if(!(datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1'] === '')){
      pdfDoc.text(`DIRECCIÓN SUCURSAL: ${datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1']}`, {width: 250});
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

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${datosCliente[0]['cli_nombres_natural']}`, 20, 315 );
    pdfDoc.text(`Identificacion: ${datosCliente[0]['cli_documento_identidad']}`, 20, 330 );
    pdfDoc.text(`Fecha Emision: ${dayVenta}/${monthVenta}/${yearVenta}`, 20, 345);
    pdfDoc.text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, 360);

    pdfDoc.rect(pdfDoc.x - 10, 320 - 10, 560, 80).stroke();
}

async function generateInvoiceTable(doc, datosVenta, datosCliente){
  let i;
  let invoiceTableTop = 420;

  doc.font("Helvetica-Bold");
 
  generateTableRow(
    doc,
    invoiceTableTop,
    "Cod Principal",
    "Description",
    "Cant",
    "Precio Unitario",
    "Precio Total"
  );

  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  let index = 0;
  let position = 0;
  for (i = 0; i < datosVenta.listVentasDetalles.length; i++) {

    const item = datosVenta.listVentasDetalles[i];
    position = invoiceTableTop + (index + 1) * 30;

    index++;

    if(position > 800){
        index = 0
        invoiceTableTop = 5;
        position = invoiceTableTop + (index + 1) * 30;
        index++;
        doc.addPage();
    }

    generateTableRow(
        doc,
        position,
        item.prod_codigo,
        item.ventad_producto,
        item.ventad_cantidad,
        formatCurrency(item.ventad_vu),
        formatCurrency(item.ventad_vt)
      );

    
    generateHr(doc, position + 20);
  }

  if(position >= 600){
    index = 0
    invoiceTableTop = 5;
    doc.addPage();
  }

  const subtotalPosition = invoiceTableTop + (index + 1) * 30;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal 12%",
    "",
    formatCurrency(datosVenta[0].venta_subtotal_12)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Subtotal 0%",
    "",
    formatCurrency(datosVenta[0].venta_subtotal_0)
  );

  const duePosition = paidToDatePosition + 25;

  let subtotalSinImpuestos = (Number(datosVenta[0].venta_subtotal_0) + Number(datosVenta[0].venta_subtotal_12)).toString();
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Subtotal Sin Impuestos",
    "",
    formatCurrency(subtotalSinImpuestos)
  );


  const icePosition = duePosition + 25;
  generateTableRow(
    doc,
    icePosition,
    "",
    "",
    "ICE",
    "",
    formatCurrency(0.00)
  );

  doc.font("Helvetica");

  const iva12Position = icePosition + 25;
  generateTableRow(
    doc,
    iva12Position,
    "",
    "",
    "IVA 12%",
    "",
    formatCurrency(datosVenta[0].venta_valor_iva)
  );

  const valorTotalPosition = iva12Position + 25;
  generateTableRow(
    doc,
    valorTotalPosition,
    "",
    "",
    "VALOR TOTAL",
    "",
    formatCurrency(datosVenta[0].venta_total)
  );

  doc.font("Helvetica");
  
  generateFooterTable(doc, datosCliente, datosVenta, subtotalPosition);

};

async function generateFooterTable(pdfDoc, datosCliente, datosVenta, yposition){
    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    pdfDoc.fontSize(9);
    
    let ypositionzero = yposition + 20;
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
    pdfDoc.rect(pdfDoc.x - 10,yposition + 30,280, 100).stroke();

    pdfDoc.lineCap('butt')
    .moveTo(210, yposition6 + 50)
    .lineTo(210, yposition6 + 90)
    .stroke()
  
    row(pdfDoc, yposition6 + 50);
    row(pdfDoc, yposition6 + 70);

    textInRowFirst(pdfDoc,'Forma de Pago', yposition6 + 60);
    textInRowFirstValor(pdfDoc,'Valor', yposition6 + 60);
    textInRowFirstValorTotal(pdfDoc,formatCurrency(datosVenta[0].venta_total), yposition6 + 80)
    textInRowValorFormaPago(pdfDoc,sharedFunctions.getFormaDePagoRide(datosVenta[0].venta_forma_pago),yposition6 + 80);
    
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
    let descriptionCut = (description.length > 60)? description.slice(0,59)  : description;
    
    doc
      .fontSize(10)
      .text(item, 20, y)
      .text(descriptionCut, 150, y,{ width: 200})
      .text(unitCost, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(lineTotal, 0, y, { align: "right" });

}

function generateHr(doc, y) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(20, y)
      .lineTo(550, y)
      .stroke();
}
 
function formatCurrency(cents) {
  return "$" + Number((cents)).toFixed(2);
}

async function getImagenByRucEmp(rucEmp){

        //CONNECT TO FTP SERVER
        const client = new ftp.Client();

        try {
            
            await  client.access({
                host: "sheyla2.dyndns.info",
                user: "firmas",
                password: "m10101418M"
            })
            
            let pathRemoteFile = `logos/${rucEmp}.png`
            let path = `./filesTMP/${rucEmp}`;
            
            if(!fs.existsSync(`${path}`)){
              
              fs.mkdirSync(`${path}`,{recursive: true});
              if(fs.existsSync(`${path}`)){

                try{
                  const response = await client.downloadTo(`${path}/${rucEmp}.png`,pathRemoteFile);

                  client.close();

                  return (response.code == 505) ? '' : `${path}/${rucEmp}.png`;

                }catch(errorInside){
                  return '';
                }

              }

            }else{
                const response = await client.downloadTo(`${path}/${rucEmp}.png`,pathRemoteFile);

                client.close();
                
                console.log('response client download image in FTP');
                console.log(response);

                return (response.code == 505) ? '' : `${path}/${rucEmp}.png`;
            }

        }catch(exception){
            client.close();
            return '';
        }

}
