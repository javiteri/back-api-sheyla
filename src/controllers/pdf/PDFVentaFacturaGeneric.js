const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const ftp = require("basic-ftp");
const util = require('util');
const sharedFunctions = require('../../util/sharedfunctions');

exports.generatePdfFromVentaFacturaGeneric = (valorIva, datosEmpresa, datosCliente, datosVenta,datosConfig,responseDatosEstablecimiento,
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
                generatePDF(valorIva, doc,datosEmpresa,datosCliente,datosVenta,datosConfig, responseDatosEstablecimiento,resolve, reject);
            });
        }else{
            generatePDF(valorIva, doc,datosEmpresa,datosCliente,datosVenta,datosConfig,responseDatosEstablecimiento, resolve, reject);
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


async function generatePDF(valorIva, pdfDoc, datosEmpresa, datosCliente,datosVenta,datosConfig, responseDatosEstablecimiento,resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_venta.pdf`;

    await generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta,datosConfig, responseDatosEstablecimiento);
    await generateInvoiceTable(valorIva, pdfDoc,datosVenta, datosCliente);

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
        resolve({
            pathFile: path + nameFile
        });
    });

    pdfDoc.end();
}

async function generateHeaderPDF(pdfDoc,datosEmpresa,datosCliente,datosVenta,datosConfig, responseDatosEstablecimiento){

  
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
    //let pathImagen = await getImagenByRucEmp(datosEmpresa[0]['EMP_RUC']);
  
    if(!pathImagen){
        pathImagen = './src/assets/logo_default_sheyla.png';
    }

    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';

    if(pathImagen){
        pdfDoc.image(pathImagen,200,50,{fit: [150, 100],align: 'center', valign: 'center'});
    }

    if(pathImagen.includes('filesTMP')){
      sharedFunctions.deleteFile(pathImagen);
    }

    pdfDoc.fontSize(9);
    pdfDoc.font(fontBold).text(datosEmpresa[0]['EMP_RAZON_SOCIAL'], 20, 170, {width: 250});
    pdfDoc.font(fontNormal).text(`DIRECCIÓN MATRIZ: ${datosEmpresa[0]['EMP_DIRECCION_MATRIZ']}`, 20, 190,{width: 250});

    if(responseDatosEstablecimiento[0]){
      pdfDoc.text(`DIRECCIÓN SUCURSAL: ${responseDatosEstablecimiento[0]['cone_direccion_sucursal']}`, {width: 250});
    }
    //pdfDoc.text(`DIRECCIÓN SUCURSAL: ${datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1']}`, 20, 210,{width: 250});

    if(obligadoContabilidad){
      pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: SI`, 20, 240,{width: 250});
    }else{
      pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: NO`, 20, 240,{width: 250});
    }

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,250,pdfDoc.y - 145).stroke();

    pdfDoc.text(`RUC: ${datosEmpresa[0]['EMP_RUC']}`, 280, 170,{width: 250});
    pdfDoc.font(fontBold).text(datosVenta[0]['venta_tipo'], 280, 185);
    pdfDoc.font(fontNormal).text(`NO:${datosVenta[0]['venta_001']}-${datosVenta[0]['venta_002']}-${datosVenta[0]['venta_numero']}`, 280, 200);


    const dateVenta = new Date(datosVenta[0].venta_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,300,pdfDoc.y - 145).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${datosCliente[0]['cli_nombres_natural']}`, 20, 285 );
    pdfDoc.text(`Fecha Emision: ${dayVenta}/${monthVenta}/${yearVenta}`, 20);
    pdfDoc.text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20);

    pdfDoc.rect(pdfDoc.x - 10, 280, 560, 80).stroke();
}

async function generateInvoiceTable(valorIva, doc, datosVenta, datosCliente){
  let i;
  let invoiceTableTop = 380;

  doc.font("Helvetica-Bold");
  
  const listDetail = [];
  for (i = 0; i < datosVenta.listVentasDetalles.length; i++) {

    let item = datosVenta.listVentasDetalles[i];

    listDetail.push({
        codigo: item.prod_codigo,
        descripcion: item.ventad_producto,
        cantidad: item.ventad_cantidad,
        pu: formatCurrency(item.ventad_vu),
        pt: formatCurrency(item.ventad_vt)
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
    `Subtotal ${parseInt(valorIva)}%`,
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


  //const icePosition = duePosition + 25;
  
  doc.font("Helvetica");

  const iva12Position = duePosition + 25;
  generateTableRow(
    doc,
    iva12Position,
    "",
    "",
    `IVA ${parseInt(valorIva)}%`,
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
    
    let ypositionzero = yposition;
    pdfDoc.font(fontBold).text('Informacion Adicional', 20, ypositionzero , {width: 250});
    let yposition1 = ypositionzero + 10;
    pdfDoc.font(fontNormal).text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, yposition1 , {width: 250});
    let yposition2 = yposition1 + 10;
    pdfDoc.text(`FORMA PAGO: ${datosVenta[0]['venta_forma_pago']}`, 20, yposition2 , {width: 250});
    let yposition3 = yposition2 + 10;
    pdfDoc.text(`RESPONSABLE: ${datosVenta[0]['usu_nombres']}`, 20, yposition3 , {width: 250});
    let yposition4 = yposition3 + 10;
    pdfDoc.text(`EMAIL: ${datosCliente[0]['cli_email']}`, 20, yposition4, {width: 250});
    let yposition5 = yposition4 + 10;
    pdfDoc.text(`TELEFONO: ${datosCliente[0]['cli_teleono']}`, 20, yposition5 , {width: 250});
    let yposition6 = yposition5 + 10;
    pdfDoc.text(`CELULAR: ${datosCliente[0]['cli_celular']}`, 20, yposition6, {width: 250});

    if(datosVenta[0]['venta_observaciones'] && datosVenta[0]['venta_observaciones'].length > 0){
      pdfDoc.text(`Obs: ${datosVenta[0]['venta_observaciones']}`, {width: 250});
    }
    

    pdfDoc.rect(pdfDoc.x - 10,yposition -5, 280, 115).stroke();


    pdfDoc.lineCap('butt')
    .moveTo(200, yposition6 + 50)
    .lineTo(200, yposition6 + 90)
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
  doc.x = 200;
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
  doc.x = 220;
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
      .fontSize(10)
      .text(item, 20, y)
      .text(description, 150, y)
      .text(unitCost, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(lineTotal, doc.page.width - 115 , y, {width: 90 , align: "right" });

}


function formatCurrency(cents) {
    return "$" + Number((cents)).toFixed(3);
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
        client.close();
        console.log(ex);
        return '';
    }
  }catch(error){
    return '';
  }  
}

