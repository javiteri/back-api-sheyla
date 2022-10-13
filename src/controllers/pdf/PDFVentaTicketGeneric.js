const PDFDocument = require('pdfkit');

exports.generatePdfFromVentaFacturaGeneric = (datosEmpresa, datosCliente, datosVenta, resolve, reject) => {

    try{
        //GENERATE PDF FROM VENTA
        const path = `./files/pdf`;

        let doc = new PDFDocument({size:[80]});
        
        if(!fs.existsSync(`${path}`)){
            fs.mkdir(`${path}`,{recursive: true}, (err) => {
                if (err) {
                    return console.error(err);
                }
                generatePDF(doc,datosEmpresa,datosCliente,datosVenta, resolve, reject);
            });
        }else{
            generatePDF(doc,datosEmpresa,datosCliente,datosVenta, resolve, reject);
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


async function generatePDF(pdfDoc, datosEmpresa, datosCliente,datosVenta, resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_venta.pdf`;

    await generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta);
    //await generateInvoiceTable(pdfDoc,datosVenta, datosCliente);//generateInvoiceTable(pdfDoc, datos, datosVenta)
   // await generateFooterTable(pdfDoc,datosCliente, datosVenta);

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
        resolve({
            pathFile: path + nameFile
        });
    });

    pdfDoc.end();
}

async function generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta){

    //let pathImagen = await getImagenByRucEmp(datosEmpresa[0]['EMP_RUC']);
  
    /*if(!pathImagen){
        pathImagen = './src/assets/logo_default_sheyla.png';
    }*/

    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    
    console.log('path image');
    console.log(pathImagen);

    /*if(pathImagen){
        pdfDoc.image(pathImagen,200,50,{fit: [150, 100],align: 'center', valign: 'center'});
    }*/
    
    pdfDoc.fontSize(9);
    pdfDoc.font(fontBold).text(datosEmpresa[0]['EMP_RAZON_SOCIAL'], 20, 170, {width: 250});
    pdfDoc.font(fontNormal).text(`DIRECCIÓN MATRIZ: ${datosEmpresa[0]['EMP_DIRECCION_MATRIZ']}`, 20, 190,{width: 250});
    pdfDoc.text(`DIRECCIÓN SUCURSAL: ${datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1']}`, 20, 210,{width: 250});
    pdfDoc.text(`Contribuyente Especial Nro: NO ESPECIAL`, 20, 230,{width: 250});
    pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: SI`, 20, 240,{width: 250});
    pdfDoc.text(`Agente de Retención Resolucion No. 1`, 20, 260,{width: 250});

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,250,pdfDoc.y - 145).stroke();

    pdfDoc.text(`RUC: ${datosEmpresa[0]['EMP_RUC']}`, 280, 170,{width: 250});
    pdfDoc.font(fontBold).text(`FACTURA`, 280, 185);
    pdfDoc.font(fontNormal).text(`NO:${datosVenta[0]['venta_001']}-${datosVenta[0]['venta_002']}-${datosVenta[0]['venta_numero']}`, 280, 200);

    pdfDoc.text(`NUMERO DE AUTORIZACION`, 280, 215);
    const dateVenta = new Date(datosVenta[0].venta_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();

    let rucEmpresa = datosEmpresa[0].EMP_RUC;
    let tipoComprobanteFactura = '01';
    let tipoAmbiente = '1';//PRUEBAS
    let serie = '001001';
    let codigoNumerico = '12174565';
    let secuencial = (datosVenta[0].venta_numero).toString().padStart(9,'0');
    let tipoEmision = 1;

    let digit48 = 
    `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
    pdfDoc.text(`${digit48}`, 280, 230);

    //pdfDoc.rect(pdfDoc.x - 10,50,300,pdfDoc.y - 20).stroke();

    pdfDoc.rect(pdfDoc.x - 10,170 - 5,300,pdfDoc.y - 145).stroke();

    pdfDoc.text(`Razón Social / Nombres y Apellidos: ${datosCliente[0]['cli_nombres_natural']}`, 20, 320 );
    pdfDoc.text(`Fecha Emision: ${dayVenta}/${monthVenta}/${yearVenta}`, 20, 340);
    pdfDoc.text(`Direccion: ${datosCliente[0]['cli_direccion']}`, 20, 360);

    pdfDoc.rect(pdfDoc.x - 10, 320 - 10, 560, 80).stroke();
}

async function generateInvoiceTable(doc, datosVenta, datosCliente){
    let i;
  let invoiceTableTop = 420;

  console.log(datosVenta);
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
        console.log('inside new page');
    }

    console.log(position);
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
  console.log(subtotalPosition);
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
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Subtotal Sin Impuestos",
    "",
    formatCurrency(0.00)
  );


  //const icePosition = duePosition + 25;
  
  doc.font("Helvetica");

  const iva12Position = duePosition + 25;
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
    console.log(datosCliente);
    pdfDoc.fontSize(9);
    
    let ypositionzero = yposition + 20;
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

    pdfDoc.rect(pdfDoc.x - 10,yposition + 15,250, 100).stroke();


    pdfDoc.lineCap('butt')
    .moveTo(200, yposition6 + 50)
    .lineTo(200, yposition6 + 90)
    .stroke()
  
    row(pdfDoc, yposition6 + 50);
    row(pdfDoc, yposition6 + 70);

    textInRowFirst(pdfDoc,'Forma de Pago', yposition6 + 60);
    //textInRowFirst(pdfDoc, yposition6 + 60);
}

function row(doc, heigth) {
    doc.lineJoin('miter')
      .rect(10, heigth, 250, 20)
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
    return "$" + (cents / 100).toFixed(2);
}



async function getImagenByRucEmp(rucEmp){

        //CONNECT TO FTP SERVER
        const client = new ftp.Client()

        try {
            await  client.access({
                host: "sheyla2.dyndns.info",
                user: "firmas",
                password: "m10101418M"
            })
            let pathRemoteFile = `logos/${rucEmp}.png`
            let path = `./filesTMP/${rucEmp}`;
            
            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, async (err) => {
                    if (err) {
                        return console.error(err);
                    }

                    const response = await client.downloadTo(`${path}/${rucEmp}.png`,pathRemoteFile);

                    client.close();

                    console.log('inside imagen');

                    return (response.code == 505) ? '' : `${path}/${rucEmp}.png`;
                });
            }else{
                const response = await client.downloadTo(`${path}/${rucEmp}.png`,pathRemoteFile);

                console.log('inside imagen');

                client.close();
                return (response.code == 505) ? '' : `${path}/${rucEmp}.png`;
            }

        }catch(exception){
            console.log('inside error');
            console.log(exception);
            client.close();
            return '';
        }

}

