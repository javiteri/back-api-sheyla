const pdfVentaFactura = require('./PDFVentaFactura');
const pdfVentaFacturaGeneric = require('./PDFVentaFacturaGeneric');

exports.generatePdfFromVenta = (datosEmpresa, datosCliente, datosVenta, isPdfNormal, datosConfig,
                                 responseDatosEstablecimiento) => {

    return new Promise((resolve, reject) => {
        try{

          if(isPdfNormal && datosVenta[0].venta_tipo.toUpperCase() == 'FACTURA'){
            pdfVentaFactura.generatePdfFromVentaFactura(datosEmpresa, datosCliente, datosVenta,datosConfig,responseDatosEstablecimiento,
                                                        resolve, reject);
          }else{
            pdfVentaFacturaGeneric.generatePdfFromVentaFacturaGeneric(datosEmpresa, datosCliente, 
                                                                      datosVenta,datosConfig, responseDatosEstablecimiento,resolve, reject);
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

exports.generatePdfFromDataXmlCompra = (datosFactura) => {
  return new Promise((resolve, reject) => {

    try{
      pdfVentaFactura.generatePdfByDatosXmlCompra(datosFactura,resolve, reject);
    }catch(ex){
      reject({
          error: true,
          message: 'error creando directorio: ' + ex
        }
    );
    }
  });
}

