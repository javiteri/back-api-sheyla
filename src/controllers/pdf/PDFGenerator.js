const pdfVentaFactura = require('./PDFVentaFactura');
const pdfVentaFacturaGeneric = require('./PDFVentaFacturaGeneric');

exports.generatePdfFromVenta = (datosEmpresa, datosCliente, 
                                datosVenta, isPdfNormal, datosConfig) => {

    return new Promise((resolve, reject) => {
        try{   
          if(isPdfNormal){
            if(datosVenta[0].venta_tipo == 'Factura' || datosVenta[0].venta_tipo == 'FACTURA'){
              pdfVentaFactura.generatePdfFromVentaFactura(datosEmpresa, datosCliente, datosVenta,datosConfig, 
                                                          resolve, reject);
            }else{
              pdfVentaFacturaGeneric.generatePdfFromVentaFacturaGeneric(datosEmpresa, datosCliente, datosVenta,datosConfig,
                                                                           resolve, reject);
            }
          }else{
            pdfVentaFacturaGeneric.generatePdfFromVentaFacturaGeneric(datosEmpresa, datosCliente, 
                                                                      datosVenta,datosConfig, resolve, reject);
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

