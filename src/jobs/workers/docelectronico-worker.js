const mysql = require('../../connectiondb/mysqlconnection');
const mysqlEFactura = require('../../connectiondb/mysqlconnectionlogin');
const httpClient = require('http');
const fs = require('fs');
const ftp = require("basic-ftp");
const Readable = require('stream').Readable;
const documentosElectronicosRepository = require('../../controllers/documentos-electronicos/data/DocumentosElectronicosRepository');


module.exports = async (job, done) => {
    try{

        const sqlQueryAutoMessage = `SELECT auto_mensaje, auto_estado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        const queryClienteIfExist = `SELECT * FROM clientes WHERE CLI_RUC = ? AND CLI_EMPRESA_ID = ? LIMIT 1`;
        const sqlInsertCliente = `INSERT INTO clientes (CLI_RUC, CLI_NOMBRE,CLI_EMPRESA_ID,CLI_CLAVE) VALUES (?,?,?,?)`;
       
        let rucCliente = job.data.ciRucCliente;
        let nombreCliente = job.data.nombreCliente;
        let empresaId = job.data.empresaId;
        let rucEmpresa = job.data.rucEmpresa;

        let ventaNumero = job.data.documentoNumero;
        let ventaTipo = (job.data.tipoDocumento.toString()).toUpperCase();
        let ventaFecha = job.data.ventaFecha;
        let ventaValor = job.data.ventaValorTotal;
        let claveAcceso = job.data.claveAct;
        let ventaId = job.data.idVenta;

        mysqlEFactura.query(sqlQueryAutoMessage, [claveAcceso], function(error, resultMensaje) {
            if(error){
                return done(new Error(error));
            }

            if(resultMensaje[0] && (resultMensaje[0].auto_mensaje === null || resultMensaje[0].auto_mensaje === undefined 
                        || resultMensaje[0].auto_estado == 0)){
                console.log('inside aun sin respuesta');
                return done(new Error('Aun sin Respuesta'));
            }

            // si el mensje indica qe fue atorizado significa que todo salio bien caso contrario 
            // caso contrario guardar un estado dew error y el mensaje que tenga 
            //let valorMensaje = resultMensaje[0].auto_mensaje;
            let valorAutoEstado = resultMensaje[0].auto_estado;

            let valorMensajeElectronica = '';
            if(resultMensaje[0].auto_mensaje && resultMensaje[0].auto_mensaje.length > 250){
                valorMensajeElectronica = resultMensaje[0].auto_mensaje.substring(0,250);
            }else{
                valorMensajeElectronica = resultMensaje[0].auto_mensaje;
            }

            // SI EL CODIGO ES DE ERROR (2) GUARDAR ESTADO EN LA TABLA VENTA
            if(valorAutoEstado == 2){
                updateEstadoVentaDocumentoElectronico('1',valorMensajeElectronica,ventaId).then(
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
                    updateEstadoVentaDocumentoElectronico('2',valorMensajeElectronica,ventaId).then(
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
                    mysqlEFactura.query(queryClienteIfExist,[rucCliente, empresaId],function(err, resultExistClient){
                        if(err){
                            return done(new Error(error));
                        }

                        if(resultExistClient.length == 0 || resultExistClient === null || resultExistClient === undefined){
                            // INSERTAR CLIENTE EN LA BASE DE DATOS PARA LUEGO INSERTAR EN LA TABLA DOCUMENTOS
                            mysqlEFactura.query(sqlInsertCliente,[rucCliente, nombreCliente,empresaId,rucCliente],function(errorClient, resultInsertClient){
                                if(errorClient){
                                    return done(new Error(errorClient));
                                }
                                
                                let idClienteReturned = resultInsertClient.insertId;

                                // INSERTAR EN LA TABLA DOCUMENTOS
                                insertDocumento(ventaTipo, ventaFecha,ventaNumero,idClienteReturned,ventaValor,
                                    claveAcceso, done, resultMensaje,ventaId,job);
                            });

                        }else{
                            let clienteId = resultExistClient[0].CLI_CODIGO;
                            // INSERTAR EN LA TABLA DOCUMENTOS
                            insertDocumento(ventaTipo, ventaFecha,ventaNumero,clienteId,ventaValor,
                                claveAcceso, done,resultMensaje,ventaId, job);
                        }

                    });

                }

            }
            
        });

    }catch(exception){
        console.log(exception);
        done(exception);
    }
};

//---------------------------------------------------------------------------------------------------------------------
function updateEstadoVentaDocumentoElectronico(estado,mensaje,ventaId, done,data){

    return new Promise((resolve, reject) => {
        try{
            const queryUpdateVentaEstado = `UPDATE ventas SET venta_electronica_estado = ?, venta_electronica_observacion = ? WHERE venta_id = ?`;

            mysql.query(queryUpdateVentaEstado,[estado,mensaje,ventaId], function(errorUp, resultUpdateVentaEstado){

                if(errorUp){
                    console.log('error insertando en estado venta');
                    reject(errorUp);
                }
                resolve('ok');
            });

        }catch(exception){
            reject('error actalizando estado venta');
        }
    });

}

//UPDATE IN ONE PLAN ENVIADOS DOCUMENTO
function updatePlanEnviadosDocumentoElectronico(rucEmp){    
    return new Promise((resolve, reject) => {
        try{
            const queryUpdatePlanWebEnviado = `UPDATE empresas SET EMPRESA_WEB_PLAN_ENVIADOS = EMPRESA_WEB_PLAN_ENVIADOS + 1 WHERE EMPRESA_RUC = ?`;

            mysqlEFactura.query(queryUpdatePlanWebEnviado,[rucEmp], function(error, resultUpdatePlanEviado){

                if(error){
                    console.log('error actualizando plan enviado');
                    reject(error);
                }
                resolve('ok');
            });

        }catch(exception){
            reject('error actualizando plan enviado');
        }
    });

}


//---------------------------------------------------------------------------------------------------------------------
function insertDocumento(ventaTipo,ventaFecha,ventaNumero,clienteId,
                            ventaValor,claveAcceso, done,resultMensaje,ventaId, job){

    const sqlInsertDocumento = `INSERT INTO documentos (documento_tipo, documento_fecha,documento_numero,
                                 documento_cliente_id,documento_valor,documento_clave_acceso) VALUES (?,?,?,?,?,?)`;

    mysqlEFactura.query(sqlInsertDocumento, [ventaTipo,ventaFecha,ventaNumero,clienteId,
                                            ventaValor,claveAcceso], function(errorr, resultInsertDocumento) {
        if(errorr){
            return done(new Error(errorr));
        }

        updateEstadoVentaDocumentoElectronico('2',resultMensaje[0].auto_mensaje,ventaId).then(
        function(result){
            createXMLPDFUtorizadoFTPAndSendEmail(claveAcceso,done, job.data);
        },
        function(error){
            done(null,job.data);
        });

    });
}

function createXMLPDFUtorizadoFTPAndSendEmail(claveAcceso, done, jobData){

    try{
        //get string xml tabla autorizaciones
        const sqlGetXmlAutorizedString = `SELECT auto_xml_autorizado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        mysqlEFactura.query(sqlGetXmlAutorizedString, [claveAcceso], async function(error, results){
            if(error){
                done();
            }            

            // UPLOAD FILES TO FTP SERVER
            await createXMLSendFTP(results[0].auto_xml_autorizado, claveAcceso);
            await createPDFSendFTP(jobData);
            
            sendEmailToClient(claveAcceso, jobData, done);
        });
        
    }catch(exception){
        console.log('error creando y enviando archivos ');
    }
}


async function createPDFSendFTP(jobData){
    const promiseCreatePDF = await documentosElectronicosRepository.generateDownloadPdfFromVenta(jobData.empresaIdLocal, jobData.idVenta,jobData.ciRucCliente,true);

    if(promiseCreatePDF.isSucess && promiseCreatePDF.generatePath){

        const client = new ftp.Client()
        try {
            await client.access({
                host: "sheyla2.dyndns.info",
                user: "sheylawebride",
                password: "m10101417M2"
            })
            await client.uploadFrom(promiseCreatePDF.generatePath,`${jobData.claveAct}.pdf`);
            
            fs.unlink(promiseCreatePDF.generatePath, function(){
                console.log(`PDF was eliminated ${promiseCreatePDF.generatePath}`) // Callback
            });

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
