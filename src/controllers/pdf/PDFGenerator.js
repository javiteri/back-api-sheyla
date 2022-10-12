const PDFDocument = require('pdfkit');
const fs = require('fs');

exports.generatePdfFromVenta = (datosEmpresa, datosCliente, datosVenta) => {

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
    });

}

function generatePDF(pdfDoc, datosEmpresa, datosCliente,datosVenta, resolve, reject){
    const path = `./files/pdf`;
    const nameFile = `/${Date.now()}_pdf_venta.pdf`;

    generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta);
    //generateInvoiceTable(pdfDoc, datos, datosVenta)

    let stream = fs.createWriteStream(`${path}${nameFile}`);
    pdfDoc.pipe(stream).on('finish', function () {
        resolve({
            pathFile: path + nameFile
        });
    });

    pdfDoc.end();
}

function generateHeaderPDF(pdfDoc, datosEmpresa, datosCliente, datosVenta){
    let fontNormal = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    
    pdfDoc.fontSize(9);
    pdfDoc.font(fontNormal).text(datosEmpresa[0]['EMP_NOMBRE'], 20, 60, {width: 250});
    pdfDoc.text(`DIRECCIÓN MATRIZ: ${datosEmpresa[0]['EMP_DIRECCION_MATRIZ']}`, 20, 75,{width: 250});
    pdfDoc.text(`DIRECCIÓN SUCURSAL: ${datosEmpresa[0]['EMP_DIRECCION_SUCURSAL1']}`, 20, 90,{width: 250});
    pdfDoc.text(`Contribuyente Especial Nro: NO ESPECIAL`, 20, 105,{width: 250});
    pdfDoc.text(`OBLIGADO A LLEVAR CONTABILIDAD: SI`, 20, 120,{width: 250});

    console.log(pdfDoc.x);
    console.log(pdfDoc.y);
    pdfDoc.rect(pdfDoc.x - 10,50,250,pdfDoc.y).stroke();

    pdfDoc.text(`RUC: ${datosEmpresa[0]['EMP_RUC']}`, 280, 60,{width: 250});
    pdfDoc.font(fontBold).text(`FACTURA`, 280, 75);
    pdfDoc.font(fontNormal).text(`NO:${datosVenta[0]['venta_001']}-${datosVenta[0]['venta_002']}-${datosVenta[0]['venta_numero']}`, 280, 90);

    pdfDoc.text(`NUMERO DE AUTORIZACION`, 280, 105);
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
    pdfDoc.text(`${digit48}`, 280, 120);


    pdfDoc.text(`FECHA Y HORA DE AUTORIZACION`, 280, 135);
    pdfDoc.text(`2022-10-08T12:26:21-05:00`, 280, 150);
    pdfDoc.text(`AMBIENTE: PRODUCCION`, 280, 165);
    pdfDoc.text(`EMISION: NORMAL`, 280, 180);
    pdfDoc.text(`CLAVE DE ACCESO`, 280, 195);
    pdfDoc.text(`BARCODE IMAGE`, 280, 210);
    pdfDoc.text(`${digit48}`, 280, 225);

    console.log(pdfDoc.x);
    console.log(pdfDoc.y);

    pdfDoc.rect(pdfDoc.x - 10,50,300,pdfDoc.y - 20).stroke();

    //pdfDoc.rect(290,110,250,150).stroke();
}

function generateInvoiceTable(pdfDoc, datosVentaDetalle){

};