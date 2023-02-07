const mysql = require('../../connectiondb/mysqlconnection');
const mysqlEFactura = require('../../connectiondb/mysqlconnectionlogin');
const httpClient = require('http');
const ftp = require("basic-ftp");
const Readable = require('stream').Readable;
const documentosElectronicosRepository = require('../../controllers/documentos-electronicos/data/DocumentosElectronicosRepository');
const {deleteFile} = require('../../util/sharedfunctions');


module.exports = async (job, done) => {
    try{

        //
        /*const listDoc = job.listDoc;
        for(const documento of listDoc){
                const {idEmp, id,identificacion,VENTA_TIPO, estado} = documento;
                
                if(estado == 0){
                    prepareAndSendDocumentoElectronicoAsync(idEmp, id,identificacion,VENTA_TIPO, nombreBd);
                }else{
                    queryStateDocumentoElectronicoError(idEmp, id,identificacion,VENTA_TIPO,nombreBd);
                }
            }
        //*/






        const sqlQueryAutoMessage = `SELECT auto_mensaje, auto_estado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        const queryClienteIfExist = `SELECT * FROM clientes WHERE CLI_RUC = ? AND CLI_EMPRESA_ID = ? LIMIT 1`;
        const sqlInsertCliente = `INSERT INTO clientes (CLI_RUC, CLI_NOMBRE,CLI_EMPRESA_ID,CLI_CLAVE) VALUES (?,?,?,?)`;
       
        let rucCliente = job.data.ciRucCliente;
        let nombreCliente = job.data.nombreCliente;
        let empresaId = job.data.empresaId;
        let rucEmpresa = job.data.rucEmpresa;
        let nombreBd = job.data.nombreBd;

        let ventaNumero = job.data.documentoNumero;
        let ventaTipo = (job.data.tipoDocumento.toString()).toUpperCase();
        let ventaFecha = job.data.ventaFecha;
        let ventaValor = job.data.ventaValorTotal;
        let claveAcceso = job.data.claveAct;
        let ventaId = job.data.idVenta;

        let resultMensaje = await mysqlEFactura.query(sqlQueryAutoMessage, [claveAcceso]);
        

        if(resultMensaje[0][0] && (resultMensaje[0][0].auto_mensaje === null || resultMensaje[0][0].auto_mensaje === undefined 
                        || resultMensaje[0][0].auto_estado == 0)){
            console.log('inside aun sin respuesta');
            return done(new Error('Aun sin Respuesta'));
        }

        // si el mensje indica qe fue atorizado significa que todo salio bien caso contrario 
        // caso contrario guardar un estado dew error y el mensaje que tenga 
        //let valorMensaje = resultMensaje[0].auto_mensaje;
        let valorAutoEstado = resultMensaje[0][0].auto_estado;

        let valorMensajeElectronica = '';
        if(resultMensaje[0][0].auto_mensaje && resultMensaje[0][0].auto_mensaje.length > 250){
                valorMensajeElectronica = resultMensaje[0][0].auto_mensaje.substring(0,250);
        }else{
                valorMensajeElectronica = resultMensaje[0][0].auto_mensaje;
        }

            // SI EL CODIGO ES DE ERROR (2) GUARDAR ESTADO EN LA TABLA VENTA
        if(valorAutoEstado == 2){
                updateEstadoVentaDocumentoElectronico('1',valorMensajeElectronica,ventaId, nombreBd).then(
                    function(result){
                        console.log('todo ok insertando estado venta error');
                        done(null,job.data);
                    },
                    function(error){
                        done(null,job.data);
                        //return done(new Error('error insertando estado venta'));
                    }
                );
        }else{
                // SUMA EN 1 A LA PROPIEDAD EMRESAS_WEB_PLAN_ENVIADOS
                updatePlanEnviadosDocumentoElectronico(rucEmpresa);

                // SI EL CLIENTE ES CONSUMIDOR FINAL ENTONCES TERMINAR EL PROCESO
                if(rucCliente == '9999999999'){
                    // TODO OK, ENVIAR EMAIL TO URL 
                    // UPDATE TABLA VENTA CON EL ESTADO SI TODO OK
                    updateEstadoVentaDocumentoElectronico('2',valorMensajeElectronica,ventaId, nombreBd).then(
                        function(result){
                            done(null,job.data);
                        },
                        function(error){
                            done(null,job.data);
                            //return done(new Error('error insertando estado venta'));
                        }
                    );
                    
                }else{
                    // DOCUMENTO AUTORIZADO 
                    // BUSCAR CLIENTE O INSERTARLO SI NO EXISTE CON LOS DATOS CORRESPONDIENTES
                    //  INSERTAR LOS VALORES EN LA TABLA DOCUMENTOS TAMBIEN QUE TENDRA EL XML 
                    // ENVIAR A UNA URL EL CORREO 
                    let resultExistClient = await mysqlEFactura.query(queryClienteIfExist,[rucCliente, empresaId]);
                    
                    if(resultExistClient[0].length == 0 || resultExistClient[0] === null || resultExistClient[0] === undefined){
                            // INSERTAR CLIENTE EN LA BASE DE DATOS PARA LUEGO INSERTAR EN LA TABLA DOCUMENTOS
                        let resultInsertClient = await mysqlEFactura.query(sqlInsertCliente,[rucCliente, nombreCliente,empresaId,rucCliente]);        
                        let idClienteReturned = resultInsertClient[0].insertId;

                        // INSERTAR EN LA TABLA DOCUMENTOS
                        insertDocumento(ventaTipo, ventaFecha,ventaNumero,idClienteReturned,ventaValor,
                                        claveAcceso, done, resultMensaje[0],ventaId,job);

                    }else{
                            let clienteId = resultExistClient[0][0].CLI_CODIGO;
                            // INSERTAR EN LA TABLA DOCUMENTOS
                            insertDocumento(ventaTipo, ventaFecha,ventaNumero,clienteId,ventaValor,
                                claveAcceso, done,resultMensaje[0],ventaId, job);
                    }

                }

        }
            
    }catch(exception){
        console.log(exception);
        done(exception);
    }
};


//---------------------------------------------------------------------------------------------------------------------
async function insertDocumento(ventaTipo,ventaFecha,ventaNumero,clienteId,
                            ventaValor,claveAcceso, done,resultMensaje,ventaId, job){

    const sqlInsertDocumento = `INSERT INTO documentos (documento_tipo, documento_fecha,documento_numero,
                                 documento_cliente_id,documento_valor,documento_clave_acceso) VALUES (?,?,?,?,?,?)`;

    await mysqlEFactura.query(sqlInsertDocumento, [ventaTipo,ventaFecha,ventaNumero,clienteId,
                                            ventaValor,claveAcceso]); 
    updateEstadoVentaDocumentoElectronico('2',resultMensaje[0].auto_mensaje,ventaId, job.data.nombreBd).then(
    function(result){
        createXMLPDFUtorizadoFTPAndSendEmail(claveAcceso,done, job.data);
    },
    function(error){
        done(null,job.data);
    });
}

async function createXMLPDFUtorizadoFTPAndSendEmail(claveAcceso, done, jobData){

    try{
        //get string xml tabla autorizaciones
        const sqlGetXmlAutorizedString = `SELECT auto_xml_autorizado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        let results = await mysqlEFactura.query(sqlGetXmlAutorizedString, [claveAcceso]); 

        // UPLOAD FILES TO FTP SERVER
        await createXMLSendFTP(results[0][0].auto_xml_autorizado, claveAcceso);
        await createPDFSendFTP(jobData);
            
        sendEmailToClient(claveAcceso, jobData, done);
    }catch(exception){
        console.log('error creando y enviando archivos ');
    }
}


async function createPDFSendFTP(jobData){
    const promiseCreatePDF = 
        await documentosElectronicosRepository.generateDownloadPdfFromVenta(jobData.empresaIdLocal, jobData.idVenta,jobData.ciRucCliente,true, jobData.nombreBd);

    if(promiseCreatePDF.isSucess && promiseCreatePDF.generatePath){

        const client = new ftp.Client()
        try {
            await client.access({
                host: "sheyla2.dyndns.info",
                user: "sheylawebride",
                password: "m10101417M2"
            })
            await client.uploadFrom(promiseCreatePDF.generatePath,`${jobData.claveAct}.pdf`);
            
            await deleteFile(promiseCreatePDF.generatePath);

        }catch(exception){
            console.log(exception)
        }

        client.close()

    }

}

async function createXMLSendFTP(stringXmlAutorizado, claveAcceso){

    const client = new ftp.Client();
    try {
        await client.access({
                host: "sheyla2.dyndns.info",
                user: "sheylawebxml",
                password: "m10101417M2"
        })

        let s = new Readable();
        s.push(stringXmlAutorizado);
        s.push(null);

        await client.uploadFrom(s,`${claveAcceso}.xml`);
        s._readableState.buffer.clear();
        s._readableState.length = 0;
    }catch(exception){
        console.log(exception)
    }
    
    client.close()

}

function sendEmailToClient(claveAcceso, jobData, done){

    let nombreEmpresa = jobData.nombreEmpresa;
    let emailCliente = jobData.emailCliente;
    let nombreCliente = jobData.nombreCliente;
    let numeroDocumento = jobData.documentoNumero;
    let paginaWeb = 'https://www.misfacturas.efacturas.net';
    let tipoDocumento = jobData.tipoDocumento;

    // SEND EMAIL
    const actualDateHours = new Date();
    const dateString = '' + actualDateHours.getFullYear() + '-' + ('0' + (actualDateHours.getMonth()+1)).slice(-2) + 
                        '-' + ('0' + actualDateHours.getDate()).slice(-2);

    //ENVIAR EMAIL AL CLIENTE
    // SE DEBE CREAR UN ARCHIVO PDF Y XML FIRMADO Y ENVIARLO POR FTP
    const callback = function(response){
        let str = '';

        //another chunk of data has been received, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
           console.log('se envio el email');

        }).on('error', err =>{
            console.log('error enviando email');
        });
    }
    
    if(emailCliente && emailCliente.length > 0 && emailCliente !== ' '){
        let firstEmailCliente = '';
        let arrayEmails = null;
        
        if(emailCliente.includes(',')){
            arrayEmails = emailCliente.split(',');
        }else{
            
            firstEmailCliente = emailCliente;
            let options = {
                host: 'sheyla2.dyndns.info',
                path: encodeURI(`/CORREOS_VARIOS/MYSQL_MAIL.php?FECHA=${dateString}&FECHAGAR=${dateString}&TIPO=2&EMPRESA=${nombreEmpresa}
                &ACCESO=${claveAcceso}&EMAIL=${firstEmailCliente}&CLIENTE=${nombreCliente}&DOCUMENTO=${tipoDocumento} ${numeroDocumento}
                &WEB=${paginaWeb}&TIME=00:00 `) 
            };

            httpClient.request(options, callback).end();

            done(null,jobData);

            return;
        }

        arrayEmails.forEach((element, index) => {
            let options = {
                host: 'sheyla2.dyndns.info',
                path: encodeURI(`/CORREOS_VARIOS/MYSQL_MAIL.php?FECHA=${dateString}&FECHAGAR=${dateString}&TIPO=2&EMPRESA=${nombreEmpresa}
                &ACCESO=${claveAcceso}&EMAIL=${element}&CLIENTE=${nombreCliente}&DOCUMENTO=${tipoDocumento} ${numeroDocumento}
                &WEB=${paginaWeb}&TIME=00:00 `) 
            };

            httpClient.request(options, callback).end();

            if(index == arrayEmails.length - 1){
                done(null,jobData);
            }
        })
   
    }else{
        done(null,jobData);
    }
}


//---------------------------------------------------------------------------------------------------------------------
function updateEstadoVentaDocumentoElectronico(estado,mensaje,ventaId, nombreBd){

    return new Promise(async (resolve, reject) => {
        try{
            const queryUpdateVentaEstado = `UPDATE ${nombreBd}.ventas SET venta_electronica_estado = ?, venta_electronica_observacion = ? WHERE venta_id = ?`;

            await mysql.query(queryUpdateVentaEstado,[estado,mensaje,ventaId]); 
            resolve('ok');
        }catch(exception){
            reject('error actalizando estado venta');
        }
    });

}

//UPDATE IN ONE PLAN ENVIADOS DOCUMENTO
function updatePlanEnviadosDocumentoElectronico(rucEmp){    
    return new Promise(async (resolve, reject) => {
        try{
            const queryUpdatePlanWebEnviado = `UPDATE empresas SET EMPRESA_WEB_PLAN_ENVIADOS = EMPRESA_WEB_PLAN_ENVIADOS + 1 WHERE EMPRESA_RUC = ?`;

            await mysqlEFactura.query(queryUpdatePlanWebEnviado,[rucEmp]);
            resolve('ok');

        }catch(exception){
            reject('error actualizando plan enviado');
        }
    });

}


//----------------------------------------------------------------
async function prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra,identificacion,tipo,nombreBd){
    // VERIFICAR SI ES UNA COMPRA O VENTA POR QUE DE ESO 
    // CONSULTAR Y OBTENER LOS DATOS DE - DATOS CLIENTE O PROVEEDOR
    // - DATOS DE LA VENTA - DATOS DETALLE DE LA VENTA O COMPRA
    // CON ESOS DATOS GENERAR EL XML Y POR AHORA GUARDARLO EN UNA CARPETA EN EL SERVER
    // OBTENER LOS DATOS DEL EMISOR (LA EMPRESA) QUE ENVIA EL DOCUMENTO ELECTRONICO
    const querySelectConfigFactElectr = `SELECT * FROM ${nombreBd}.config WHERE con_empresa_id= ? AND con_nombre_config LIKE ? `;
    const querySelectCliente = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
    const querySelectVenta = `SELECT ventas.*, usuarios.usu_nombres FROM ${nombreBd}.ventas, ${nombreBd}.usuarios WHERE venta_usu_id = usu_id AND venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
    const querySelectVentasDetalles = `SELECT ventas_detalles.* ,productos.prod_codigo, productos.prod_nombre 
                                        FROM ${nombreBd}.ventas_detalles, ${nombreBd}.productos WHERE 
                                        ventad_prod_id = prod_id AND ventad_venta_id = ?`;
    const queryDatosEmpresaById = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ?`;
    const sqlQuerySelectDatosEstablecimiento = `SELECT * FROM ${nombreBd}.config_establecimientos WHERE cone_empresa_id = ? AND cone_establecimiento = ? LIMIT 1`;

    try{
        const responseDatosConfig = await pool.query(querySelectConfigFactElectr, [idEmp,'FAC_ELECTRONICA%']);
        const responseDatosEmpresa = await pool.query(queryDatosEmpresaById,[idEmp]);
        const responseDatosCliente = await pool.query(querySelectCliente, [idEmp, identificacion]);
        const responseDatosVenta = await pool.query(querySelectVenta, [idEmp, idVentaCompra]);
        const responseDatosVentaDetalles = await pool.query(querySelectVentasDetalles, [idVentaCompra]);
        const responseDatosEstablecimiento = await pool.query(sqlQuerySelectDatosEstablecimiento, [idEmp, responseDatosVenta[0].venta_001]);

        const valorGenerateXmlResponse = await generateXmlDocumentoElectronicoVenta(responseDatosCliente[0][0],responseDatosVenta[0][0],responseDatosVentaDetalles[0],
                                                                                    responseDatosEmpresa[0][0],responseDatosConfig[0], responseDatosEstablecimiento[0]);

        const pathFile = valorGenerateXmlResponse.pathFile;
        const claveActivacion = valorGenerateXmlResponse.claveAct;

        //INSERT XML FILE IN DB BLOB
        const sqlQuerySelectEmpresa = `SELECT empresa_id FROM empresas WHERE empresa_ruc = ? LIMIT 1`;
        const sqlQueryInsertXmlBlob = `INSERT INTO autorizaciones (auto_id_empresa,auto_clave_acceso, auto_xml) VALUES (?,?,?)`;
        const sqlQueryExistXmlInsert = `SELECT * FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        const queryPlanEnviados = `SELECT EMPRESA_WEB_PLAN_CANTIDAD, EMPRESA_WEB_PLAN_ENVIADOS,
                                            CASE WHEN EMPRESA_WEB_PLAN_ENVIADOS >= EMPRESA_WEB_PLAN_CANTIDAD THEN 0 
                                            ELSE 1 END AS isSucess
                                            FROM empresas WHERE EMPRESA_RUC = ?`;

        const responseSelectEmpresaAutorizacion = await poolEFactra.query(sqlQuerySelectEmpresa,[responseDatosEmpresa[0][0].EMP_RUC]);
        const responsePlanEnviados = await poolEFactra.query(queryPlanEnviados, [responseDatosEmpresa[0][0].EMP_RUC]);

        if(responsePlanEnviados[0][0].isSucess == 1){
            const responseXmlExist = await poolEFactra.query(sqlQueryExistXmlInsert,[claveActivacion]);
            // SI EXISTE XML EN LA TABLA AUTORIZACIONES ENTONCES HACER OTRAS VALIDACIONES, CASO CONTRARIO SEGUIR CON LA INSERCION
            if(Object.entries(responseXmlExist[0]).length > 0){
                // VERIFICAR SI ES UN ERROR O YA SE AUTORIZO PARA REALIZAR EL PROCESO CORRESPONDIENTE 
                // SE OBTENIENE EL ESTADO DE LA FACTRUA EN LA TABLA AUTORIZACION
                // SE VERIFICA SI YA SE AUTORIZO O SIGUE EN ERROR
                const queryUpdateFacAutorizacion = `DELETE FROM autorizaciones WHERE auto_clave_acceso = ?`;
                const queryUpdateVentaEstado = `UPDATE ${nombreBd}.ventas SET venta_electronica_estado = ?, venta_electronica_observacion = ? WHERE venta_id = ?`;

                if(responseXmlExist[0][0].auto_estado == 2){
                    await poolEFactra.query(queryUpdateFacAutorizacion,[claveActivacion]);
                    await pool.query(queryUpdateVentaEstado,[0,'En Espera...',idVentaCompra]);
                    //DELETE XML FILE GENERATED
                    await deleteFile(pathFile);
                    prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra, identificacion, tipo, nombreBd);
                }else if(responseXmlExist[0][0].auto_estado == 1){
                    // YA SE AUTORIZO EL DOCUMENTO DEBO ACTUALIZAR ESE ESTADO EN LA VENTA
                    await pool.query(queryUpdateVentaEstado,[2,responseXmlExist[0][0].auto_mensaje,idVentaCompra]);
                    //DELETE XML FILE GENERATED
                    await deleteFile(pathFile);
                    sendDataToWorkerAutorizacion(claveActivacion, responseSelectEmpresaAutorizacion[0][0].empresa_id, responseDatosEmpresa[0][0],
                                                        responseDatosCliente[0][0], responseDatosVenta[0][0], nombreBd);
                }else{
                    //DELETE XML FILE GENERATED
                    await deleteFile(pathFile);
                }

            }else{
                // READ XML FILE AS STRING
                let stream  = fs.createReadStream(pathFile);
                stream.setEncoding('utf-8');
                let xmlString = '';

                stream.on('data',function(chunk){
                    xmlString += chunk;
                });

                stream.on('end', async function() {
                    let str = xmlString.replace(/[\n\r\t]+/g, '');
                            
                    await poolEFactra.query(sqlQueryInsertXmlBlob,[responseSelectEmpresaAutorizacion[0][0].empresa_id,claveActivacion, str]);
                    //DELETE XML FILE GENERATED
                    await deleteFile(pathFile);

                    sendDataToWorkerAutorizacion(claveActivacion, responseSelectEmpresaAutorizacion[0][0].empresa_id, responseDatosEmpresa[0][0],
                                                        responseDatosCliente[0][0], responseDatosVenta[0][0], nombreBd);
                });
            }
        }
    }catch(exception){
        console.log(exception);
    }

}


async function queryStateDocumentoElectronicoError(idEmp, idVentaCompra, identificacion, tipo, nombreBd){
   
    const querySelectVenta = `SELECT ventas.*, usuarios.usu_nombres FROM ${nombreBd}.ventas, 
                            ${nombreBd}.usuarios WHERE venta_usu_id = usu_id AND venta_empresa_id = ?  AND venta_id = ? LIMIT 1`;
    const queryDatosEmpresaById = `SELECT * FROM ${nombreBd}.empresas WHERE emp_id = ?`;
    const querySelectCliente = `SELECT * FROM ${nombreBd}.clientes WHERE cli_empresa_id = ? AND cli_documento_identidad = ? LIMIT 1`;
    
    let empResponse = await pool.query(queryDatosEmpresaById,[idEmp]);
    let clienteResponse = await pool.query(querySelectCliente, [idEmp, identificacion]);

    const datosCliente = clienteResponse[0][0];
    const datosEmpresa = empResponse[0][0];

    let ventaResponse = await pool.query(querySelectVenta, [idEmp, idVentaCompra]);

    const datosVenta = ventaResponse[0][0];

    const dateVenta = new Date(datosVenta.venta_fecha_hora);
    const dayVenta = dateVenta.getDate().toString().padStart(2,'0');
    const monthVenta = (dateVenta.getMonth() + 1).toString().padStart(2,'0');
    const yearVenta = dateVenta.getFullYear().toString();

    let rucEmpresa = datosEmpresa.EMP_RUC;
    let tipoComprobanteFactura = sharedFunctions.getTipoComprobanteVenta(datosVenta.venta_tipo);
    let tipoAmbiente = '2';//PRODUCCION //PRUEBAS '1    '
    let serie = `${datosVenta.venta_001}${datosVenta.venta_002}`;
    let codigoNumerico = '12174565';
    let secuencial = (datosVenta.venta_numero).toString().padStart(9,'0');
    let tipoEmision = 1;
        
    let digit48 = 
                `${dayVenta}${monthVenta}${yearVenta}${tipoComprobanteFactura}${rucEmpresa}${tipoAmbiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
                
    let claveActivacion = sharedFunctions.modulo11(digit48);
        
    //query in table Autorizaciones for state with clave
    const sqlQuerySelectAutoFacState = `SELECT auto_estado, auto_mensaje,auto_id_empresa FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
    const queryPlanEnviados = `SELECT EMPRESA_WEB_PLAN_CANTIDAD, EMPRESA_WEB_PLAN_ENVIADOS,
                                CASE WHEN EMPRESA_WEB_PLAN_ENVIADOS >= EMPRESA_WEB_PLAN_CANTIDAD THEN 0 
                                ELSE 1 END AS isSucess
                                FROM empresas WHERE EMPRESA_RUC = ?`;

    let results = await poolEFactra.query(sqlQuerySelectAutoFacState,[claveActivacion]);
    let resultPlan = await  poolEFactra.query(queryPlanEnviados, [rucEmpresa]);

    if(resultPlan[0][0].isSucess == 1){
        if(results[0].length <= 0){
            // no existe en la tabla autorizaciones
            //enviar otra vez el xml al servicio
            await prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra, identificacion, tipo, nombreBd);
            return{estado:'ok'};
        }else{
            // SE OBTENIENE EL ESTADO DE LA FACTURA EN LA TABLA AUTORIZACION
            // SE VERIFICA SI YA SE AUTORIZO O SIGUE EN ERROR
            const queryUpdateFacAutorizacion = `DELETE FROM autorizaciones WHERE auto_clave_acceso = ?`;
            const queryUpdateVentaEstado = `UPDATE ${nombreBd}.ventas SET venta_electronica_estado = ?, venta_electronica_observacion = ? WHERE venta_id = ?`;

            //2.-Error
            if(results[0][0].auto_estado == 2){
                await poolEFactra.query(queryUpdateFacAutorizacion,[claveActivacion]);                     
                await pool.query(queryUpdateVentaEstado,[0,'En Espera...',idVentaCompra]);
                            
                await prepareAndSendDocumentoElectronicoAsync(idEmp, idVentaCompra, identificacion,tipo, nombreBd);

                return{estado:'ok'}
            }else if(results[0][0].auto_estado == 1){
                // YA SE AUTORIZO EL DOCUMENTO DEBO ACTUALIZAR ESE ESTADO EN LA VENTA
                await pool.query(queryUpdateVentaEstado,[2,results[0][0].auto_mensaje,idVentaCompra]);
                
                //ENVIAR A  LA COLA PARA QUE GUARDE LOS DATOS DEL XML Y ENVIE POR CORREO
                sendDataToWorkerAutorizacion(claveActivacion,results[0][0].auto_id_empresa,datosEmpresa,
                                                datosCliente,datosVenta,nombreBd)
                return{estado:'ok'}
            }else if(results[0][0].auto_estado == 0){
                await pool.query(queryUpdateVentaEstado,[0,'En Espera...',idVentaCompra]);
                return{estado:'ok'}
            }
        }
    }else{
        return {
            isSucess: false, 
            message:'no cuenta con documentos para autorizar',
            isAllowAutorizar: false
        };
    }
   
}

