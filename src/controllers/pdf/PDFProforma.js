const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const util = require('util');
const ftp = require("basic-ftp");
const sharedFunctions = require('../../util/sharedfunctions');

exports.generatePdfFromProforma = (valorIva, datosEmpresa,datosCliente,datosProforma) => {
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
                    generatePDF(valorIva, doc,datosEmpresa,datosCliente,datosProforma, resolve, reject);
                });
            }else{
                generatePDF(valorIva, doc,datosEmpresa,datosCliente,datosProforma, resolve, reject);
            }
    
        }catch(exception){
            reject({
                error: true,
                message: 'error creando directorio: ' + exception
            });
        }

    });
}

async function generatePDF(valorIva, pdfDoc, datosEmpresa, datosCliente, datosProforma,resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_proforma.pdf`;

    await generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosProforma);
    await generateInvoiceTable(valorIva, pdfDoc,datosProforma, datosCliente);

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
      stream.end();
      resolve({
            pathFile: path + nameFile
      });
    });
    pdfDoc.end();
    
}

async function generateHeaderPDF(pdfDoc,datosEmpresa,datosCliente,datosProforma){

    let pathImagen = await getImagenByRucEmp(datosEmpresa[0]['EMP_RUC']);;
  
    if(!pathImagen){
        pathImagen = './src/assets/logo_default_sheyla.png';
    }

    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';

    if(pathImagen){
        pdfDoc.image(pathImagen,200,10,{fit: [150, 100],align: 'center', valign: 'center'});
    }

    if(pathImagen.includes('filesTMP')){
      fs.unlink(pathImagen, function(){
        console.log('imagen, eliminada');
      });
    }

    pdfDoc.fontSize(9);
    pdfDoc.font(fontBold).text(datosEmpresa[0]['EMP_RAZON_SOCIAL'], 20, 130, {width: 250});
    pdfDoc.font(fontNormal).text(`DIRECCIÓN MATRIZ: ${datosEmpresa[0]['EMP_DIRECCION_MATRIZ']}`, 20, 150,{width: 250});

    pdfDoc.rect(pdfDoc.x - 10, 130 - 5, 250, pdfDoc.y - 100).stroke();

    pdfDoc.text(`RUC: ${datosEmpresa[0]['EMP_RUC']}`, 280, 130,{width: 250});
    pdfDoc.font(fontBold).text('PROFORMA', 280, 150);
    pdfDoc.font(fontNormal).text(`NO:${datosProforma[0]['prof_numero']}`, 280, 170);


    const dateVenta = new Date(datosProforma[0].prof_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();

    pdfDoc.rect(pdfDoc.x - 10,130 - 5,300,pdfDoc.y - 105).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${datosCliente[0]['cli_nombres_natural']}`, 20, 230 );
    pdfDoc.text(`Fecha Emision: ${dayVenta}/${monthVenta}/${yearVenta}`, 20, 250);
    pdfDoc.text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, 270);

    pdfDoc.rect(pdfDoc.x - 10, 230 - 10, 560, 80).stroke();
}

async function generateInvoiceTable(valorIva, doc, datosProforma, datosCliente){
  let i;
  let invoiceTableTop = 315;

  doc.font("Helvetica-Bold");
  
  const listDetail = [];
  let valorDescuentoSum = 0.0;

  for(i = 0; i < datosProforma.listProformasDetalles.length; i++){

    let item = datosProforma.listProformasDetalles[i];
    if(item.profd_descuento.trim()){
      valorDescuentoSum += ((Number(item.profd_cantidad) * Number(item.profd_vu)) * Number(item.profd_descuento)) / 100;
    }
    
    listDetail.push({
      codigo: item.prod_codigo,
      descripcion: item.profd_producto,
      cantidad: item.profd_cantidad,
      pu: formatCurrency(item.profd_vu, 3),
      descPercent: formatPercent(item.profd_descuento),
      pt: formatCurrency(item.profd_vt, 3)
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
  
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    `Subtotal ${valorIva}%`,
    "",
    formatCurrency(datosProforma[0].prof_subtotal_12, 2)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Subtotal 0%",
    "",
    formatCurrency(datosProforma[0].prof_subtotal_0, 2)
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
    formatCurrency(subtotalSinImpuestos, 2)
  );


  //const icePosition = duePosition + 25;
  
  doc.font("Helvetica");
  
  const descuentoPosition = duePosition + 30;
  generateTableRow(
    doc,
    descuentoPosition,
    "",
    "",
    "Descuento",
    "",
    formatCurrency(valorDescuentoSum, 2)
  );

  const iva12Position = descuentoPosition + 25;
  generateTableRow(
    doc,
    iva12Position,
    "",
    "",
    `IVA ${valorIva}%`,
    "",
    formatCurrency(datosProforma[0].prof_valor_iva, 2)
  );

  const valorTotalPosition = iva12Position + 25;
  generateTableRow(
    doc,
    valorTotalPosition,
    "",
    "",
    "VALOR TOTAL",
    "",
    formatCurrency(datosProforma[0].prof_total, 2)
  );

  doc.font("Helvetica");

  generateFooterTable(doc, datosCliente, datosProforma, subtotalPosition - 25);

};

async function generateFooterTable(pdfDoc, datosCliente, datosProforma, yposition){
    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';

    pdfDoc.fontSize(9);
    
    let ypositionzero = yposition + 20;
    pdfDoc.font(fontBold).text('Informacion Adicional', 20, ypositionzero , {width: 250});
    let yposition1 = ypositionzero + 10;
    //pdfDoc.font(fontNormal).text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, yposition1 , {width: 250});
    let yposition2 = yposition1 + 10;
    pdfDoc.font(fontNormal).text(`FORMA PAGO: ${datosProforma[0]['prof_forma_pago']}`, 20, yposition2 , {width: 250});
    let yposition3 = yposition2 + 10;
    pdfDoc.text(`RESPONSABLE: ${datosProforma[0]['usu_nombres']}`, 20, yposition3 , {width: 250});
    let yposition4 = yposition3 + 10;
    pdfDoc.text(`EMAIL: ${datosCliente[0]['cli_email']}`, 20, yposition4, {width: 250});
    let yposition5 = yposition4 + 10;
    pdfDoc.text(`TELEFONO: ${datosCliente[0]['cli_teleono']}`, 20, yposition5 , {width: 250});
    let yposition6 = yposition5 + 10;
    pdfDoc.text(`CELULAR: ${datosCliente[0]['cli_celular']}`, 20, yposition6, {width: 250});

    if(datosProforma[0]['prof_observaciones'] && datosProforma[0]['prof_observaciones'].length > 0){
      pdfDoc.text(`Obs: ${datosProforma[0]['prof_observaciones']}`, {width: 250});
    }

    pdfDoc.rect(pdfDoc.x - 10,yposition + 30,280, 100).stroke();


    pdfDoc.lineCap('butt')
    .moveTo(200, yposition6 + 50)
    .lineTo(200, yposition6 + 90)
    .stroke()
  
    row(pdfDoc, yposition6 + 50);
    row(pdfDoc, yposition6 + 70);

    textInRowFirst(pdfDoc,'Forma de Pago', yposition6 + 60);
    textInRowFirstValor(pdfDoc,'Valor', yposition6 + 60);
    textInRowFirstValorTotal(pdfDoc,formatCurrency(datosProforma[0].prof_total, 2), yposition6 + 80)
    textInRowValorFormaPago(pdfDoc,sharedFunctions.getFormaDePagoRide(datosProforma[0].prof_forma_pago),yposition6 + 80);

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
      .text(lineTotal, doc.page.width - 115, y, {width: 90 , align: "right" });

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
        client.close();
        console.log(ex);
        return '';
    }
  }catch(error){
    return '';
  }  
}