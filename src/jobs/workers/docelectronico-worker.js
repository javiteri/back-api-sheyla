const mysql = require('../../connectiondb/mysqlconnection');
const mysqlEFactura = require('../../connectiondb/mysqlconnectionlogin');
const httpClient = require('http');
const fs = require('fs');
const ftp = require("basic-ftp");
const Readable = require('stream').Readable;
const documentosElectronicosRepository = require('../../controllers/documentos-electronicos/data/DocumentosElectronicosRepository');


module.exports = (job, done) => {
    try{

        const sqlQueryAutoMessage = `SELECT auto_mensaje, auto_estado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        const queryClienteIfExist = `SELECT * FROM clientes WHERE CLI_RUC = ? AND CLI_EMPRESA_ID = ? LIMIT 1`;
        const sqlInsertCliente = `INSERT INTO clientes (CLI_RUC, CLI_NOMBRE,CLI_EMPRESA_ID,CLI_CLAVE) VALUES (?,?,?,?)`;
       
        let rucCliente = job.data.ciRucCliente;
        let nombreCliente = job.data.nombreCliente;
        let empresaId = job.data.empresaId;
        
        let ventaNumero = job.data.documentoNumero;
        let ventaTipo = (job.data.tipoDocumento.toString()).toUpperCase();
        let ventaFecha = job.data.ventaFecha;
        let ventaValor = job.data.ventaValorTotal;
        let claveAcceso = job.data.claveAct;
        let ventaId = job.data.idVenta;

        mysqlEFactura.query(sqlQueryAutoMessage, [claveAcceso], function(error, resultMensaje) {
            if(error){
                console.log('error consultando mensaje');
                return done(new Error(error));
            }

            if(resultMensaje[0] && (resultMensaje[0].auto_mensaje === null || resultMensaje[0].auto_mensaje === undefined)){
                console.log('inside aun sin respuesta');
                return done(new Error('Aun sin Respuesta'));
            }

            // si el mensje indica qe fue atorizado significa que todo salio bien caso contrario 
            // caso contrario guardar un estado dew error y el mensaje que tenga 
            //let valorMensaje = resultMensaje[0].auto_mensaje;
            let valorAutoEstado = resultMensaje[0].auto_estado;

            // SI EL CODIGO ES DE ERROR (2) GUARDAR ESTADO EN LA TABLA VENTA
            if(valorAutoEstado == 2){
                console.log('estado de error, actualizando venta estado');
                updateEstadoVentaDocumentoElectronico('1',resultMensaje[0].auto_mensaje,ventaId).then(
                    function(result){
                        console.log('todo ok insertando estado venta error');
                        done(null,job.data);
                    },
                    function(error){
                        console.log('error insertando estado venta');
                        return done(new Error('error insertando estado venta'));
                    }
                );
            }else{
                // SI EL CLIENTE ES CONSUMIDOR FINAL ENTONCES TERMINAR EL PROCESO
                if(rucCliente == '9999999999'){
                    // TODO OK, ENVIAR EMAIL TO URL 
                    // UPDATE TABLA VENTA CON EL ESTADO SI TODO OK
                    updateEstadoVentaDocumentoElectronico('2',resultMensaje[0].auto_mensaje,ventaId).then(
                        function(result){
                            done(null,job.data);
                        },
                        function(error){
                            return done(new Error('error insertando estado venta'));
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
                    console.log(errorUp);
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
            //done(null,job.data);
        },
        function(error){
            return done(new Error('error insertando estado venta'));
        });

    });
}

function createXMLPDFUtorizadoFTPAndSendEmail(claveAcceso, done, jobData){

    try{
        console.log('job data');
        console.log(jobData);
        //get string xml tabla autorizaciones
        const sqlGetXmlAutorizedString = `SELECT auto_xml_autorizado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        mysqlEFactura.query(sqlGetXmlAutorizedString, [claveAcceso], async function(error, results){
            if(error){
                console.log(error);
            }            

            // UPLOAD FILES TO FTP SERVER
            await createXMLSendFTP(results[0].auto_xml_autorizado);
            await createPDFSendFTP(jobData);
            
            sendEmailToClient(claveAcceso, jobData, done);
        });
        
    }catch(exception){
        console.log('error creando y enviando archivos ');
    }
}


async function createPDFSendFTP(jobData){
    console.log('inside send pdf ride ftp');
    const promiseCreatePDF = await documentosElectronicosRepository.generateDownloadPdfFromVenta(jobData.empresaIdLocal, jobData.idVenta,jobData.ciRucCliente,true);

    console.log('result await generate pdf');
    console.log(promiseCreatePDF);
    if(promiseCreatePDF.isSucess && promiseCreatePDF.generatePath){

        const client = new ftp.Client()
        try {
            await client.access({
                host: "sheyla2.dyndns.info",
                user: "sheylawebride",
                password: "m10101417M2"
            })
            console.log('upload pdf');
            const response = await client.uploadFrom(promiseCreatePDF.generatePath,`${jobData.claveAct}.pdf`);
            console.log(response);
            fs.unlink(promiseCreatePDF.generatePath, function(){
                console.log(`PDF was eliminated ${promiseCreatePDF.generatePath}`) // Callback
            });

        }catch(exception){
            console.log(err)
        }

        client.close()

    }

}

async function createXMLSendFTP(stringXmlAutorizado, claveAcceso){
    console.log('inside send xml ftp');    

    const client = new ftp.Client();
    
    try {
        //const readable = Readable.from(stringXmlAutorizado);
        await client.access({
                host: "sheyla2.dyndns.info",
                user: "sheylawebxml",
                password: "m10101417M2"
        })
        let s = new Readable();
        s.push(stringXmlAutorizado);
        s.push(null);
        console.log('readable');
        console.log(s);
        const response = await client.uploadFrom(s,`${claveAcceso}.xml`);
        
        console.log('response ftp send xml');
        console.log(response);
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

    console.log(nombreEmpresa);
    console.log(emailCliente);
    console.log(nombreCliente);
    console.log(numeroDocumento);
    console.log(paginaWeb);
    console.log(claveAcceso);

    // SEND EMAIL
    console.log('eviar email aqui');
    console.log(emailCliente);

    const actualDateHours = new Date();
    const dateString = '' + actualDateHours.getFullYear() + '-' + ('0' + (actualDateHours.getMonth()+1)).slice(-2) + 
                        '-' + ('0' + actualDateHours.getDate()).slice(-2);

    //ENVIAR EMAIL AL CLIENTE
    // SE DEBE CREAR UN ARCHIVO PDF Y XML FIRMADO Y ENVIARLO POR FTP
    console.log('before send email');
    var options = {
        host: 'sheyla2.dyndns.info',
        path: encodeURI(`/CORREOS_VARIOS/MYSQL_MAIL.php?FECHA=${dateString}&FECHAGAR=${dateString}&TIPO=2&EMPRESA=${nombreEmpresa}
        &ACCESO=${claveAcceso}&EMAIL=${emailCliente}&CLIENTE=${nombreCliente}&DOCUMENTO=${numeroDocumento}
        &WEB=${paginaWeb}&TIME=00:00 `) 
    };
    const callback = function(response){
        let str = '';

        //another chunk of data has been received, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
           console.log('se envio el email');
           console.log(str);

           //SEND EMAIL TO CLIENT
           done(null,jobData);

        }).on('error', err =>{
            console.log('error request');
            console.log(err);

            //SEND EMAIL TO CLIENT
            done(null,jobData);
        });
    }

    httpClient.request(options, callback).end();

}