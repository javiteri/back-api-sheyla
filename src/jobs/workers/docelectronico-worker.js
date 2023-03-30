const mysql = require('../../connectiondb/mysqlconnection');
const mysqlEFactura = require('../../connectiondb/mysqlconnectionlogin');
const httpClient = require('http');
const ftp = require("basic-ftp");
const Readable = require('stream').Readable;
const documentosElectronicosRepository = require('../../controllers/documentos-electronicos/data/DocumentosElectronicosRepository');
const {deleteFile} = require('../../util/sharedfunctions');


module.exports = async (job, done) => {
    try{

        const data = job.data.returnvalue;

        console.log(`data in worker autorizar ${data}`);
        const sqlQueryAutoMessage = `SELECT auto_mensaje, auto_estado FROM autorizaciones WHERE auto_clave_acceso = ? LIMIT 1`;
        const queryClienteIfExist = `SELECT * FROM clientes WHERE CLI_RUC = ? AND CLI_EMPRESA_ID = ? LIMIT 1`;
        const sqlInsertCliente = `INSERT INTO clientes (CLI_RUC, CLI_NOMBRE,CLI_EMPRESA_ID,CLI_CLAVE) VALUES (?,?,?,?)`;
       
        let rucCliente = data.ciRucCliente;
        let nombreCliente = data.nombreCliente;
        let empresaId = data.empresaId;
        let rucEmpresa = data.rucEmpresa;
        let nombreBd = data.nombreBd;

        let ventaNumero = data.documentoNumero;
        let ventaTipo = (data.tipoDocumento.toString()).toUpperCase();
        let ventaFecha = data.ventaFecha;
        let ventaValor = data.ventaValorTotal;
        let claveAcceso = data.claveAct;
        let ventaId = data.idVenta;

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
                    done(null,data);
                },
                function(error){
                    done(null,data);
                }
            );
        }else{
            // SUMA EN 1 A LA PROPIEDAD EMRESAS_WEB_PLAN_ENVIADOS
            await updatePlanEnviadosDocumentoElectronico(rucEmpresa);

            // SI EL CLIENTE ES CONSUMIDOR FINAL ENTONCES TERMINAR EL PROCESO
            if(rucCliente == '9999999999'){
                // TODO OK, ENVIAR EMAIL TO URL 
                // UPDATE TABLA VENTA CON EL ESTADO SI TODO OK
                updateEstadoVentaDocumentoElectronico('2',valorMensajeElectronica,ventaId, nombreBd).then(
                    function(result){
                        done(null, data);
                    },
                    function(error){
                        done(null, data);
                    }
                );
                    
            }else{
                // DOCUMENTO AUTORIZADO 
                // BUSCAR CLIENTE O INSERTARLO SI NO EXISTE CON LOS DATOS CORRESPONDIENTES
                // INSERTAR LOS VALORES EN LA TABLA DOCUMENTOS TAMBIEN QUE TENDRA EL XML 
                // ENVIAR A UNA URL EL CORREO 
                let resultExistClient = await mysqlEFactura.query(queryClienteIfExist,[rucCliente, empresaId]);
                    
                if(resultExistClient[0].length == 0){
                    // INSERTAR CLIENTE EN LA BASE DE DATOS PARA LUEGO INSERTAR EN LA TABLA DOCUMENTOS
                    let resultInsertClient = await mysqlEFactura.query(sqlInsertCliente,[rucCliente, nombreCliente,empresaId,rucCliente]);
                    let idClienteReturned = resultInsertClient[0].insertId;

                    // INSERTAR EN LA TABLA DOCUMENTOS
                    insertDocumento(ventaTipo, ventaFecha,ventaNumero,idClienteReturned,ventaValor,
                                    claveAcceso, done, resultMensaje[0],ventaId, data);

                    }else{
                        let clienteId = resultExistClient[0][0].CLI_CODIGO;
                        // INSERTAR EN LA TABLA DOCUMENTOS
                        insertDocumento(ventaTipo, ventaFecha,ventaNumero,clienteId,ventaValor,
                                        claveAcceso, done,resultMensaje[0],ventaId, data);
                    }
            }
        }
            
    }catch(exception){
        console.log(exception);
        done(null);
        //done(exception);
    }
};


//---------------------------------------------------------------------------------------------------------------------
async function insertDocumento(ventaTipo,ventaFecha,ventaNumero,clienteId,
                                ventaValor,claveAcceso, done,resultMensaje,ventaId, jobData){

    const sqlInsertDocumento = `INSERT INTO documentos (documento_tipo, documento_fecha,documento_numero,
                                 documento_cliente_id,documento_valor,documento_clave_acceso) VALUES (?,?,?,?,?,?)`;

    await mysqlEFactura.query(sqlInsertDocumento, [ventaTipo,ventaFecha,ventaNumero,clienteId, ventaValor,claveAcceso]); 
    updateEstadoVentaDocumentoElectronico('2',resultMensaje[0].auto_mensaje,ventaId, jobData.nombreBd).then(
        function(result){
            createXMLPDFUtorizadoFTPAndSendEmail(claveAcceso,done, jobData);
        },
        function(error){
            done(null,job.data);
        }
    );
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
        //let firstEmailCliente = '';
        let arrayEmails = null;
        
        if(emailCliente.includes(',')){
            arrayEmails = emailCliente.split(',');
        }else{
            
            arrayEmails = [emailCliente];
           // firstEmailCliente = [emailCliente];
            /*let options = {
                host: 'sheyla2.dyndns.info',
                path: encodeURI(`/CORREOS_VARIOS/MYSQL_MAIL.php?FECHA=${dateString}&FECHAGAR=${dateString}&TIPO=2&EMPRESA=${nombreEmpresa}
                &ACCESO=${claveAcceso}&EMAIL=${firstEmailCliente}&CLIENTE=${nombreCliente}&DOCUMENTO=${tipoDocumento} ${numeroDocumento}
                &WEB=${paginaWeb}&TIME=00:00 `) 
            };

            httpClient.request(options, callback).end();

            done(null,jobData);

            return;*/
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
                done(null, jobData);
            }
        })
   
    }else{
        done(null, jobData);
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


