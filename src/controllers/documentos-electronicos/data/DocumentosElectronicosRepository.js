const pool = require('../../../connectiondb/mysqlconnection');
const fs = require('fs');
const xmlBuilder = require('xmlbuilder');
const pdfGenerator = require('../../pdf/PDFGenerator');


exports.getDocumentosElectronicosByIdEmp = async(datosFiltrar) => {
    return new Promise((resolve, reject) => {
        try{
            const {idEmp, fechaIni, fechaFin, tipo, nodoc,nombresci} = datosFiltrar;

            let valueNombreClient = "";
            let valueCiRucClient = "";

            if(nombresci){
                const containsNumber =  /^[0-9]*$/.test(nombresci);
                valueCiRucClient = containsNumber ? nombresci : "";

                const containsText =  !containsNumber;
                valueNombreClient = containsText ? nombresci : "";
            }


            const sqlQueryDocumentosElectronicos = `SELECT VENTA_TIPO,venta_id AS id,venta_fecha_hora as fecha, 
            CONCAT(venta_001,'-',venta_002,'-',venta_numero) AS numeroFactura, venta_total AS total,cli_nombres_natural AS cliente, cli_documento_identidad AS identificacion, 
            venta_forma_pago AS formaPago, venta_electronica_estado AS estado FROM ventas,clientes WHERE venta_empresa_id = ?  AND venta_cliente_id=cli_id AND venta_tipo LIKE ?
            AND (cli_nombres_natural LIKE ? && cli_documento_identidad LIKE ?) AND venta_fecha_hora BETWEEN ? AND ?
            AND venta_numero LIKE ? AND venta_anulado=0 
            UNION ALL 
            SELECT compra_tipo,compra_id,compra_fecha_hora,compra_numero, compra_total AS total, pro_nombre_natural, pro_documento_identidad AS identificacion,
            compra_forma_pago , compra_electronica_estado 
            FROM compras,proveedores  WHERE compra_empresa_id = ? AND compra_proveedor_id=pro_id AND compra_tipo LIKE ?
            AND compra_fecha_hora  BETWEEN ? AND ?
            AND (pro_nombre_natural LIKE ? && pro_documento_identidad LIKE ?) AND compra_numero LIKE ? `;

            pool.query(sqlQueryDocumentosElectronicos, [idEmp,"%"+tipo,"%"+valueNombreClient+"%",
            "%"+valueCiRucClient+"%", fechaIni, fechaFin,"%"+nodoc,    idEmp,"%"+tipo,fechaIni,fechaFin,"%"+valueNombreClient+"%",
            "%"+valueCiRucClient+"%","%"+nodoc], function(error, results) {

                if(error){
                    console.log(error);
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'Ocurrio un error al consultar la lista de documentos electronicos'
                    });

                    return;
                }

                resolve({
                    isSucess: true,
                    data: results
                });
            });

        }catch(exception){
            reject({
                isSucess: false,
                code: 400,
                message: 'Error obteniendo documentos electronicos'
            });
        }
    });
}


exports.atorizarDocumentoElectronico = (idEmp, idVentaCompra,identificacion,tipo) => {
    return new Promise(async (resolve,reject) => {
        try{
            // VERIFICAR SI ES UNA COMPRA O VENTA POR QUE DE ESO 
            // CONSULTAR Y OBTENER LOS DATOS DE - DATOS CLIENTE O PROVEEDOR
            // - DATOS DE LA VENTA - DATOS DETALLE DE LA VENTA O COMPRA
            // CON ESOS DATOS GENERAR EL XML Y POR AHORA GUARDARLO EN UNA CARPETA EN EL SERVER
            // OBTENER LOS DATOS DEL EMISOR (LA EMPRESA) QUE ENVIA EL DOCUMENTO ELECTRONICO


            const querySelectCliente = `SELECT * FROM clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
            const querySelectVenta = `SELECT * FROM ventas WHERE venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
            const querySelectVentasDetalles = `SELECT * FROM ventas_detalles WHERE ventad_venta_id = ?`;
            const queryDatosEmpresaById = `SELECT * FROM empresas WHERE emp_id = ?`;

            pool.query(queryDatosEmpresaById,[idEmp], (err, datosEmpresa) => {
                if(err){
                    console.log('error inside empresa request');
                    return reject(err);
                }

                pool.query(querySelectCliente, [idEmp, identificacion], (error, clienteResponse) => {
                    if(error){
                        console.log('error inside cliente request');
                        return reject(error);
                    }
                
                    pool.query(querySelectVenta, [idEmp, idVentaCompra], (errorr, ventaResponse) => {
                        if(errorr){
                            return reject(errorr);
                        }
    
                        pool.query(querySelectVentasDetalles, [idVentaCompra], (erro, ventaDetalleResponse) => {
                            if(erro){
                                return reject(erro);
                            }

                            const valorGenerateXmlResponse = 
                                    generateXmlDocumentoElectronicoVenta(clienteResponse[0],ventaResponse[0],ventaDetalleResponse, datosEmpresa[0]);
                            valorGenerateXmlResponse.then(
                                function(data){
                                    resolve(data);
                                },
                                function(error){
                                    reject(error);
                                }
                            );
                        });
                    });
                });

            });
        }catch(exception){
            reject({
                isSucess: false,
                message: 'Error enviando documento electronico'
            });
        }
    });
};



function generateXmlDocumentoElectronicoVenta(datosCliente, datosVenta, listVentaDetalle,datosEmpresa){

    return new Promise((resolve, reject) => {
        try{

            const dateVenta = new Date(datosVenta.venta_fecha_hora);
            const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
            const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
            const yearVenta = dateVenta.getFullYear().toString();
    
            let rucEmpresa = datosEmpresa.EMP_RUC;
            let tipoComprobanteFactura = '01';
            let tipoAmbiente = '1';//PRUEBAS
            let serie = '001001';
            let codigoNumerico = '12174565';
            let secuencial = (datosVenta.venta_numero).toString().padStart(9,'0');
            let tipoEmision = 1;

            let digit48 = 
            `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
                            
            let claveActivacion = modulo11(digit48);
            // GENERAR XML CON XMLBUILDER LIBRARY AND SET VALUES FROM DATA IN PARAMETERS 
            let rootElement = xmlBuilder.create('factura').att('id','Comprobante').att('version','2.0.0');
            rootElement.ele('infoTributaria').ele('ambiente','1').up().ele('tipoEmision','1').up()
                                    .ele('razonSocial',datosEmpresa.EMP_RAZON_SOCIAL).up().ele('nombreComercial','Prueba 2').up().ele('ruc','1234545454001').up()
                                    .ele('claveAcceso',claveActivacion).up().ele('codDoc','01').up()
                                    .ele('estab',datosVenta.venta_001).up().ele('ptoEmi',datosVenta.venta_002).up().ele('secuencial',secuencial).up().ele('dirMatriz','SALINAS').up();
            rootElement.ele('infoFactura').ele('fechaEmision','21/03/2022').up().ele('dirEstablecimiento','PAEZ').up()
                        .ele('contribuyenteEspecial','12345').up().ele('obligadoContabilidad','SI').up().ele('tipoIdentificacionComprador','07').up()
                        .ele('razonSocialComprador','CONSUMIDOR FINAL').up().ele('identificacionComprador','9999999999999').up()
                        .ele('direccionComprador','salinas y santiago').up().ele('totalSinImpuestos','50.00').up().ele('totalDescuento','0.00').up()
                        .ele('totalConImpuestos').ele('totalImpuesto').ele('codigo','2').up().ele('codigoPorcentaje','2').up()
                        .ele('baseImponible','50.00').up().ele('valor','6.00').up().up().up().ele('propina','0.00').up().ele('importeTotal','61.00').up()
                        .ele('moneda','DOLAR').up().ele('pagos').ele('pago').ele('formaPago','19').up().ele('total','61,00').up().ele('plazo','30').up()
                        .ele('unidadTiempo','dias').up().up().up().ele('valorRetIva','0.00').up().ele('valorRetRenta','0.00');

            let detallesNode = rootElement.ele('detalles');

            for(let i = 0; i < 1; i++){
                detallesNode.ele('detalle').ele('codigoPrincipal','001').up().ele('codigoAuxiliar','0011').up().ele('descripcion','BIEN').up()
                .ele('cantidad','1').up().ele('precioUnitario','50').up().ele('descuento','0').up().ele('precioTotalSinImpuesto','50.00').up()
                .ele('impuestos').ele('impuesto').ele('codigo','2').up().ele('codigoPorcentaje','2').up().ele('tarifa','12.00').up()
                .ele('baseImponible','50.00').up().ele('valor','6.00').up().up().up().up();
            }

            rootElement.ele('otrosRubrosTerceros').ele('rubro').ele('concepto','CONCEPTO1').up().ele('total','10').up().up()
            .ele('rubro').ele('concepto','CONCEPTO2').up().ele('total','12').up().up().ele('rubro').ele('concepto','CONCEPTO3').up().ele('total','5').up().up()
            .ele('rubro').ele('concepto','CONCEPTO4').up().ele('total','25').up().up().up();

            const xmlFinal = rootElement.end({pretty: true});

            // SAVE XML FILE IN FOLDER SERVER
            const path = `./files/${datosEmpresa.EMP_ID}`;
            if(!fs.existsSync(`${path}`)){
                fs.mkdir(`${path}`,{recursive: true}, (err) => {
                    if (err) {
                        return console.error(err);
                    }
    
                    fs.writeFileSync(`${path}/FACTURA001.xml`, xmlFinal, function(error){
                        if(error){
                            console.log('error escribiendo archivo');
                        }
                    })
                });
            }else{
                fs.writeFileSync(`${path}/FACTURA001.xml`, xmlFinal, function(error){
                    if(error){
                        console.log('error escribiendo archivo');
                    }
                })
            }

            resolve('ok');
        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                error: 'error creando xml documento venta, reintente'
            });
        }
    });

}

function modulo11(clave48Digitos){
    let suma = 0;
    let factor = 7;

    const arrayDigits = Array.from(clave48Digitos);

    arrayDigits.forEach(element => {

        suma = suma + Number(element) * factor;

        factor = factor - 1;
        if(factor == 1) factor = 7;
    });

    let digitoVerificador = (suma % 11);
    digitoVerificador = 11 - digitoVerificador;
    if(digitoVerificador == 11){
        digitoVerificador = 0;
    }else if(digitoVerificador == 10){
        digitoVerificador = 1;
    }

    return `${clave48Digitos}${digitoVerificador}`;
}


exports.generateDownloadPdfFromVenta = (idEmp, idVentaCompra, identificacionClienteProv) => {
    return new Promise((resolve, reject) => {
        try{

            const sqlQuerySelectEmp = `SELECT * FROM empresas WHERE emp_id = ? LIMIT 1`;
            const sqlQuerySelectClienteByIdEmp = `SELECT * FROM clientes WHERE cli_documento_identidad = ? AND cli_empresa_id = ? LIMIT 1`;
            const sqlQuerySelectVentaByIdEmp = `SELECT ventas.*, usu_nombres FROM ventas, usuarios WHERE venta_usu_id = usu_id AND venta_id = ? AND venta_empresa_id = ? LIMIT 1`;
            const sqlQuerySelectVentaDetallesByIdVenta = `SELECT ventas_detalles.*, prod_codigo FROM ventas_detalles, productos WHERE 
            ventad_prod_id = prod_id AND ventad_venta_id = ? `;

            pool.query(sqlQuerySelectEmp,[idEmp], (err, datosEmpresa) => {
                if(err){
                    console.log('error inside empresa request');
                    return reject(err);
                }

                pool.query(sqlQuerySelectClienteByIdEmp, [identificacionClienteProv,idEmp], (error, clienteResponse) => {
                    if(error){
                        console.log('error inside cliente request');
                        return reject(error);
                    }
                
                    pool.query(sqlQuerySelectVentaByIdEmp, [idVentaCompra,idEmp], (errorr, ventaResponse) => {
                        if(errorr){
                            return reject(errorr);
                        }
    
                        pool.query(sqlQuerySelectVentaDetallesByIdVenta, [idVentaCompra], (erro, ventaDetalleResponse) => {
                            if(erro){
                                return reject(erro);
                            }
                            // GENERATE PDF WHIT DATA                            
                            ventaResponse['listVentasDetalles'] = ventaDetalleResponse;
                            const pathPdfGeneratedProm = pdfGenerator.generatePdfFromVenta(datosEmpresa,clienteResponse,ventaResponse);

                            pathPdfGeneratedProm.then(
                                function(result){
                                    resolve({
                                        isSucess: true,
                                        message: 'todo Ok',
                                        generatePath: result.pathFile
                                    });
                                },
                                function(error){
                                    reject({
                                        isSucess: false,
                                        message:  error.message
                                    });
                                }
                            );
                            

                        });

                    });

                });

            });


        }catch(exception){
            reject({
                isSucess: false,
                message: 'Ocurrio un error generando el PDF'
            });
        }

    });
};