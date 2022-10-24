const pdfVentaFactura = require('./PDFVentaFactura');
const pdfVentaFacturaGeneric = require('./PDFVentaFacturaGeneric');

exports.generatePdfFromVenta = (datosEmpresa, datosCliente, datosVenta, isPdfNormal) => {

    return new Promise((resolve, reject) => {
        try{
          
          if(isPdfNormal){
            if(datosVenta[0].venta_tipo == 'Factura'){
              pdfVentaFactura.generatePdfFromVentaFactura(datosEmpresa, datosCliente, datosVenta, resolve, reject);
            }else{
              pdfVentaFacturaGeneric.generatePdfFromVentaFacturaGeneric(datosEmpresa, datosCliente, datosVenta, resolve, reject);
            }
          }else{

            pdfVentaFacturaGeneric.generatePdfFromVentaFacturaGeneric(datosEmpresa, datosCliente, datosVenta, resolve, reject);
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

