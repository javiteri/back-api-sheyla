const PDFDocument = require('pdfkit');
const fs = require('fs');
const util = require('util');
const ftp = require("basic-ftp");

exports.generatePdfFromProforma = (datosEmpresa,datosCliente,datosProforma) => {
    return new Promise((resolve, reject) => {

        try{
            //GENERATE PDF FROM VENTA
            const path = `./files/pdf`;
            let doc = new PDFDocument({margin: 50, size: 'A4'});
    
            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        return console.error(err);
                    }                
                    generatePDF(doc,datosEmpresa,datosCliente,datosProforma, resolve, reject);
                });
            }else{
                generatePDF(doc,datosEmpresa,datosCliente,datosProforma, resolve, reject);
            }
    
        }catch(exception){
            reject({
                error: true,
                message: 'error creando directorio: ' + exception
            });
        }

    });
}

async function generatePDF(pdfDoc, datosEmpresa, datosCliente, datosProforma,resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_proforma.pdf`;

    await generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosProforma);
    await generateInvoiceTable(pdfDoc,datosProforma, datosCliente);

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
      stream.end();
      resolve({
            pathFile: path + nameFile
      });
    });
    pdfDoc.end();
    
}

async function generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosProforma){

  let fechaAutorizacion = ''
  let isAutorizado = false;

  /*if(datosVenta[0].venta_electronica_observacion.includes('AUTORIZADO') && datosVenta[0].venta_electronica_estado == 2){
    try{
      isAutorizado = true;
      fechaAutorizacion = (datosVenta[0].venta_electronica_observacion.split(' - '))[2]
    }catch(exception){
      isAutorizado = false;
      fechaAutorizacion = '';
    }
  }*/

    /*let contribuyenteEspecial = '';
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
    }*/

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
    
    /*if(responseDatosEstablecimiento[0]){
      pdfDoc.text(`DIRECCIÓN SUCURSAL: ${responseDatosEstablecimiento[0]['cone_direccion_sucursal']}`, {width: 250});
    }*/
    /*if(!(datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1'] === '')){
      pdfDoc.text(`DIRECCIÓN SUCURSAL: ${datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1']}`, {width: 250});
    }*/

    /*if(!(contribuyenteEspecial === '')){
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
    }*/

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,250,pdfDoc.y - 150).stroke();

    pdfDoc.text(`RUC: ${datosEmpresa[0]['EMP_RUC']}`, 280, 60,{width: 250});
    pdfDoc.font(fontBold).text(`PROFORMA No.`, 280, 80);
    let numeroProforma = (datosProforma[0].prof_numero).toString().padStart(9,'0');
    //pdfDoc.font(fontNormal).text(`${datosVenta[0]['venta_001']}-${datosVenta[0]['venta_002']}-${secuencial}`, 280, 95);
    pdfDoc.font(fontNormal).text(`${numeroProforma}`, 280, 95);

    /*pdfDoc.text(`NUMERO DE AUTORIZACION`, 280, 120);
    const dateVenta = new Date(datosVenta[0].venta_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();*/

    let rucEmpresa = datosEmpresa[0].EMP_RUC;
    //let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(datosVenta[0].venta_tipo);
    //let tipoAmbiente = '2';//PRODUCCION
    //let serie = `${datosVenta[0]['venta_001']}${datosVenta[0]['venta_002']}`;
    //let codigoNumerico = '12174565';
    //let tipoEmision = 1;

    //let digit48 = 
    //`${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;

    //let claveActivacion = modulo11(digit48);
    //let claveActivacion = sharedFunctions.modulo11(digit48);

    //pdfDoc.text(`${claveActivacion}`, 280, 130);

    /*if(isAutorizado){
      pdfDoc.text(`FECHA Y HORA DE AUTORIZACION`, 280, 150);
      pdfDoc.text(`${fechaAutorizacion}`, 280, 160);
    }*/

    //let claveEncoder = new encoder();

    /*pdfDoc.text(`AMBIENTE: PRODUCCION`, 280, 180);
    pdfDoc.text(`EMISION: NORMAL`, 280, 200);
    pdfDoc.text(`CLAVE DE ACCESO`, 280, 220);
    pdfDoc.font('./src/assets/font/LibreBarcode128-Regular.ttf')
            .fontSize(27).text(claveEncoder.encode(`${claveActivacion}`) ,{
              lineGap: -7,
              align: 'justify',
            });
    pdfDoc.font(fontNormal).fontSize(9).text(`${claveActivacion}`, 280);*/

    pdfDoc.rect(pdfDoc.x - 10,50,300,pdfDoc.y - 25).stroke();

    //pdfDoc.rect(290,110,250,150).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${datosCliente[0]['cli_nombres_natural']}`, 20, 315 );
    pdfDoc.text(`Identificacion: ${datosCliente[0]['cli_documento_identidad']}`, 20, 330 );
    pdfDoc.text(`Fecha Emision: ${dayVenta}/${monthVenta}/${yearVenta}`, 20, 345);
    pdfDoc.text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, 360);

    pdfDoc.rect(pdfDoc.x - 10, 320 - 10, 560, 80).stroke();
}

async function generateInvoiceTable(doc, datosProforma, datosCliente){
  let i;
  let invoiceTableTop = 420;

  doc.font("Helvetica-Bold");
 
  generateTableRow(
    doc,
    invoiceTableTop,
    "Cod Principal",
    "Descripcion",
    "Cant",
    "Precio Unitario",
    "Precio Total"
  );

  generateHr(doc, invoiceTableTop + 15);
  doc.font("Helvetica");

  let index = 0;
  let position = 0;
  for (i = 0; i < datosProforma.listProformasDetalles.length; i++) {

    const item = datosVdatosProformaenta.listProformasDetalles[i];
    position = invoiceTableTop + (index + 1) * 30;
    //position = invoiceTableTop + 1 * 30;
    index++;

    if(position > 780){
        index = 0
        invoiceTableTop = 5;
        position = invoiceTableTop + (index + 1) * 30;
        //position = invoiceTableTop + 1 * 30;
        index++;
        doc.addPage();
    }

    const heightString = doc.heightOfString(item.ventad_producto,{width: 200});

    generateTableRow1(
        doc,
        position,
        item.prod_codigo,
        item.profd_producto,
        item.profd_cantidad,
        formatCurrency(item.pprofd_vt)
      );

    generateHr(doc, position + (heightString - 10));
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
    formatCurrency(datosProforma[0].prof_subtotal_12)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Subtotal 0%",
    "",
    formatCurrency(datosProforma[0].profd_subtotal_0)
  );

  const duePosition = paidToDatePosition + 25;

  let subtotalSinImpuestos = (Number(datosProforma[0].prof_subtotal_0) + Number(datosProforma[0].prof_subtotal_12)).toString();
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Subtotal Sin Impuestos",
    "",
    formatCurrency(subtotalSinImpuestos)
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
    formatCurrency(datosProforma[0].prof_valor_iva)
  );

  const valorTotalPosition = iva12Position + 25;
  generateTableRow(
    doc,
    valorTotalPosition,
    "",
    "",
    "VALOR TOTAL",
    "",
    formatCurrency(datosProforma[0].prof_total)
  );

  doc.font("Helvetica");
  
  generateFooterTable(doc, datosCliente, datosProforma, subtotalPosition);

};

async function generateFooterTable(pdfDoc, datosCliente, datosProforma, yposition){
    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    pdfDoc.fontSize(9);
    
    let ypositionzero = yposition + 20;
    pdfDoc.font(fontBold).text('Informacion Adicional', 20, ypositionzero , {width: 250});
    let yposition1 = ypositionzero + 10;
    //pdfDoc.font(fontNormal).text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, yposition1 , {width: 250});
    /*pdfDoc.font(fontNormal).text(`Direccion: ${datosCliente[0]['cli_direccion']}`, {width: 250});
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
    pdfDoc.text(`CELULAR: ${datosCliente[0]['cli_celular']}`, {width: 250});*/

    if(datosProforma[0]['prof_observaciones'] && datosProforma[0]['prof_observaciones'].length > 0){
      pdfDoc.text(`Obs: ${datosProforma[0]['prof_observaciones']}`, {width: 250});
    }
    pdfDoc.rect(pdfDoc.x - 10,yposition + 30,280, 100).stroke();

    pdfDoc.lineCap('butt')
    .moveTo(210, yposition1 + 50)
    .lineTo(210, yposition1 + 90)
    .stroke()
  
    row(pdfDoc, yposition1 + 50);
    row(pdfDoc, yposition1 + 70);

    textInRowFirst(pdfDoc,'Forma de Pago', yposition1 + 60);
    textInRowFirstValor(pdfDoc,'Valor', yposition1 + 60);
    textInRowFirstValorTotal(pdfDoc,formatCurrency(datosProforma[0].prof_total), yposition1 + 80)
    textInRowValorFormaPago(pdfDoc,sharedFunctions.getFormaDePagoRide(datosProforma[0].prof_forma_pago),yposition1 + 80);
    
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
    //let descriptionCut = (description.length > 60)? description.slice(0,59)  : description;
    
    doc
      .fontSize(10)
      .text(item, 20, y)
      .text(description, 150, y,{ width: 200})
      .text(unitCost, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(lineTotal, 0, y, { align: "right" });

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
  //let descriptionCut = (description.length > 60)? description.slice(0,59)  : description;
  let yAxisValue = y - 11;

  doc
    .fontSize(8)
    .text(item, 20, yAxisValue)
    .text(description, 150, yAxisValue ,{ width: 200})
    .text(unitCost, 280, yAxisValue, { width: 90, align: "right" })
    .text(quantity, 370, yAxisValue, { width: 90, align: "right" })
    .text(lineTotal, 0, yAxisValue, { align: "right" });

}


function generateHr(doc, y) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(20, y )
      .lineTo(550, y )
      .stroke();
}
 
function formatCurrency(cents) {
  return "$" + Number((cents)).toFixed(2);
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
            host: "sheyla2.dyndns.info",
            user: "firmas",
            password: "m10101418M"
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
        client.close();
        console.log(ex);
        return '';
    }
  }catch(error){
    return '';
  }

}