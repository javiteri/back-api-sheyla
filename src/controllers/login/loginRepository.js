const poolMysql = require('../../connectiondb/mysqlconnection');
const poolMysqlBd1 = require('../../connectiondb/mysqlconnectionlogin');
const httpClient = require('http');

exports.loginUser = function(user, password){
    return new Promise(async(resolve, reject) => {
        try{
        
            let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
            let results = await poolMysql.query(query, [user, password]);
            
            if(!results | results == undefined | results == null){
                reject('error no existe usuario');      
                return;
            }
                            
            let userMysqlData; 
                
            userMysqlData = {
                'cedula': results[0][0].USU_CEDULA,
                'nombre': results[0][0].USU_NOMBRE_USUARIO    
            }

            resolve(userMysqlData);
    
        }catch(error){
            resolve(`error query user login ${error}`)
        }
    })
}

exports.loginValidateExistEmpresaRucBd1 = function(ruc){
    
    return new Promise(async(resolve, reject) => {
        try {
            let query = "SELECT * FROM empresas WHERE empresa_ruc = ? LIMIT 1";
            let results = await poolMysqlBd1.query(query, [ruc]);
            
            if(!results[0] | results[0] == undefined | results[0] == null | !results.length){
                reject('no existe empresa');
                return;
            }
            
            let existEmpresaResponse;
            existEmpresaResponse = {
                'isSuccess': true,
                'ruc': ruc,
                'nombre': results[0][0].EMPRESA_NOMBRE,
                'finFacturacion': row.EMPRESA_FECHA_FIN_FACTURACION
            }
                    
            if(new Date(existEmpresaResponse.finFacturacion) >= new Date()){
                existEmpresaResponse['isFacturacionAvailable'] = true;
            }else{
                existEmpresaResponse['isFacturacionAvailable'] = false;
            }

            resolve(existEmpresaResponse);
        
        }catch(error){
            reject('error en verify empresa');
        }
    });

}

exports.loginAndValidateEmp = function(ruc, username, password){
    return new Promise((resolve, reject) => {
        try{
            getNameBdByRuc(ruc).then(
                async function(result){
                
                    if(!result.existEmp){
                        resolve(result);
                        return;
                    }

                    const dbName = result.value;
                    
                    // CONSULTAR DATOS PLAN CLIENTE
                    let queryNumDocAndLicenceDays = `SELECT empresa_web_plan_enviados as emitidos,empresa_fecha_fin_facturacion as finfactura FROM
                        efactura_factura.empresas WHERE 
                        efactura_factura.empresas.EMPRESA_RUC = ?`;
    

                    let datosEmpresa = await poolMysqlBd1.query(queryNumDocAndLicenceDays, [ruc]);
                    
                    const dateActual = new Date();
                    const dateInit = new Date(datosEmpresa[0][0].finfactura);
                    
                    let time = dateInit.getTime() - dateActual.getTime(); 
                    let days = time / (1000 * 3600 * 24); //Diference in Days

                    let diasLicenciaValue = Number(days).toFixed(0);

                    if(diasLicenciaValue <= 0){ 
                        resolve({
                            isSuccess: true,
                            code: 400,
                            sinLicencia: true,
                            mensage: 'dias de licencia expirados'
                        });
                        return;
                    }

                    let queryEmpresas = `SELECT * FROM ${dbName}.empresas WHERE emp_ruc = ? LIMIT 1`;
                    let query = `SELECT * FROM ${dbName}.usuarios WHERE usu_username = ? AND usu_password = ? AND usu_empresa_id = ? LIMIT 1`;
                    
                    let resultEmpresa = await poolMysql.query(queryEmpresas, [ruc]);
                    
                    if(!resultEmpresa[0] | !resultEmpresa[0].length){
                        reject(' error, no se encontro la empresa');
                        return;
                    }

                    let idEmpresa = resultEmpresa[0][0].EMP_ID;
                    let nombreEmpresa = resultEmpresa[0][0].EMP_NOMBRE;


                    let results = await poolMysql.query(query,[username, password, idEmpresa]);

                    if(!results[0] | !results[0].length){
                        resolve({
                            isSuccess: true,
                            existUser: false
                        });
                        return;
                    }
                    
                    let idUsuario = results[0][0].usu_id;
                    let nombreUsuario = results[0][0].usu_nombres;

                    resolve({
                        isSuccess: true,
                        existUser: true,
                        idUsuario: idUsuario,
                        nombreUsuario: nombreUsuario,
                        idEmpresa: idEmpresa,
                        nombreEmpresa: nombreEmpresa,
                        rucEmpresa: ruc,
                        redirectToHome: true,
                        nombreBd: result.value
                    })                  
                },
                function(error){
                    reject(error);
                }
            );
            
        }catch(exception){
            reject({
                isSucess: false,
                message: 'ocurrio un error en la validacion login'
            });
        }
    });
}


exports.createEmpresaByRuc = function(ruc){
    return new Promise((resolve, reject) => {
        try{
            //PARA NUEVA EMPRESA http://sheyla2.dyndns.info/sheylaweb/CREAR_EMPRESA.php?SERIE=1718792656001
            let options = {
                host: 'sheyla2.dyndns.info',
                path: `/sheylaweb/CREAR_EMPRESA.php?SERIE=${ruc}`
            };
            const callback = function(response){
                let str = '';

                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function () {
                    
                    if(str.includes('ERROR')){
                        resolve({
                            isSucess: true,
                            isError: true,
                            message: 'ocurrio un error al crear la empresa'
                        });
                        return;
                    }
                    if(str.includes('YAEXISTE')){
                        resolve({
                            isSucess: true,
                            existEmp: true,
                            message: 'la empresa ya existe'
                        });
                        return;
                    }

                    if(str.includes('NUEVAEMPRESAOK')){

                        let options1 = {
                            host: 'sheyla2.dyndns.info',
                            path: `/sheylaweb/VALIDAR_EMPRESA.php?SERIE=${ruc}`
                        };
                        const callback1 = function(response){
                            let str1 = '';
            
                            //another chunk of data has been received, so append it to `str`
                            response.on('data', function (chunk) {
                                str1 += chunk;
                            });
            
                            response.on('end', async function () {
            
                                if(str1.includes('NOEXISTE')){
                                    resolve({
                                        isSucess: false,
                                        existEmp: false,
                                        message: 'No existe la empresa'
                                    });
                                    return;
                                }
            
                                if(str1.includes('***OK')){
                                    
                                    //let dbName = str1.split(',')[1].replaceAll('*','');
                                    let valor = str1.split(',')[1];
                                    let valor1 = valor.replace('*','');
                                    let valor2 = valor1.replace('*','');
                                    let valorFinal = valor2.replace('*','');

                                    let dbName = valorFinal;
                                    
                                    let querySelectEmpresa = `SELECT * FROM ${dbName}.empresas WHERE emp_ruc = ? LIMIT 1`;
                                    let queryInsertUserDefaultEmpresa = `INSERT INTO ${dbName}.usuarios (usu_empresa_id, usu_identificacion, usu_nombres, usu_telefonos,usu_direccion, 
                                                usu_mail, usu_fecha_nacimiento, usu_username, usu_password, usu_permiso_escritura)
                                                VALUES (?,?,?,?,?,?,?,?,?,?)`;
                                    let results = await poolMysql.query(querySelectEmpresa, [ruc]);
                                    
                                    let idEmpresa = results[0][0].EMP_ID;

                                    await poolMysql.query(queryInsertUserDefaultEmpresa, [idEmpresa, '9999999999','Usuario Default','', '', '', 
                                                                                            '2000-01-01', 'ADMIN', 'ADMIN', 1]);
                                                        
                                    resolve({
                                        isSucess: true,
                                        isCreateEmp: true,
                                        username: 'ADMIN',
                                        password: 'ADMIN',
                                        rucEmpresa: ruc
                                    });

                                }
            
                            });
                        }
            
                        httpClient.request(options1, callback1).end();
                    }

                }).on('error', err =>{
                    console.log('error request');
                    console.log(err);
                });
            }

            httpClient.request(options, callback).end();

        }catch(exception){
            reject({
                isSucess: false,
                message: 'error creando nueva empresa'
            });
        }
    });
};

exports.recoveryPasswordByRucAndEmail = function(ruc, email){

    return new Promise((resolve, reject) => {
        try{
            let options = {
                host: 'sheyla2.dyndns.info',
                path: `/sheylaweb/VALIDAR_EMPRESA.php?SERIE=${ruc}`
            };
            const callback = function(response){
                let str1 = '';
        
                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    str1 += chunk;
                });
        
                response.on('end', async function () {
        
                    if(str1.includes('NOEXISTE')){
                        resolve({
                            isSucess: false,
                            existEmpresa: false,
                            message: 'No existe la empresa'
                        });
                        return;
                    }
        
                    if(str1.includes('***OK')){
                        
                        let valor = str1.split(',')[1];
                        let valor1 = valor.replace('*','');
                        let valor2 = valor1.replace('*','');
                        let valorFinal = valor2.replace('*','');
        
                        let dbName = valorFinal.trim();

                        let querySelectEmpresa = ''; 
                        let params = [];
                        if(email){

                            querySelectEmpresa = `SELECT * FROM ${dbName}.empresas WHERE emp_ruc = ? AND emp_mail = ? LIMIT 1`;
                            let queryUser = `SELECT * FROM ${dbName}.usuarios WHERE usu_empresa_id = ? AND usu_permiso_escritura = 1 LIMIT 1`;

                            params = [ruc,email];

                            let results = await poolMysql.query(querySelectEmpresa, params);

                            if(results[0].length === 0 ){
                                resolve({
                                    isSucess: false,
                                    existEmpresa: false
                                });
                                return;
                            }

                            let idEmpresa = results[0][0].EMP_ID;
    
                            let result = await poolMysql.query(queryUser,[idEmpresa]);
                           
                            if(!result[0] && result[0].length === 0 ){
                                resolve({
                                    isSucess: false,
                                    existEmpresa: false,
                                    message: 'no se encontro usuario predeterminado para empresa'
                                });
                                return;
                            }

                            /// SEND EMAIL TO URL FOR RECOVERY PASSWORD
                            sendEmailRecoveryAccount(ruc, email,result[0], resolve, reject);

                        }else{
                            querySelectEmpresa = `SELECT * FROM ${dbName}.empresas WHERE emp_ruc = ? LIMIT 1`;
                            params = [ruc];
                            
                            let results = await poolMysql.query(querySelectEmpresa, params);

                            if(!results[0] | !results[0].length){
                                reject({
                                    isSucess: false,
                                    existEmpresa: false
                                });
                                return;
                            }
    
                            resolve({
                                isSucess: true,
                                existEmpresa: true
                            });

                        }
                    }
        
                });
            }
        
            httpClient.request(options, callback).end();

        }catch(exception){
            reject({
                isSuccess: false,
                message: 'Ocrrio un error '
            });
        }
    });
    
};

async function sendEmailRecoveryAccount(ruc, email,datosUsario,resolve, reject){
    try{
        
        const textMensage = `Hola. <br><br>Los datos de usuario para ingresar a su cuenta son: <br><br> Username: ${datosUsario.usu_username}. 
        <br>Password: ${datosUsario.usu_password}<br><br>Saludos.`;
        const path = `/CORREOS_letIOS/EMAIL_NOTIFICACIONES/EMAIL.php?EMAIL=${email}&ASUNTO=RECUPERAR CUENTA&MENSAJE2=${textMensage}`;

        let options = {
            host: 'sheyla2.dyndns.info',
            path: encodeURI(path)
        };

        const callback = function(response){
            let str1 = '';
    
            //another chunk of data has been received, so append it to `str`
            response.on('data', function (chunk) {
                str1 += chunk;
            });
    
            response.on('end', function () {
    
                console.log(str1);
                resolve({
                    isSucess: true,
                    message: 'Correo enviado correctamente'
                });
    
            });
        }


        httpClient.request(options, callback).end();

    }catch(exception){
        console.log(exception);
        reject({
            isSuccess: false,
            message: 'Error enviando el email URL'
        });
    }
}

function getNameBdByRuc(ruc){
    return new Promise((resolve, reject) => {
        try{

            // HACER UN REQUEST A http://sheyla2.dyndns.info/sheylaweb/VALIDAR_EMPRESA.php?SERIE=1718792656001
            let options = {
                host: 'sheyla2.dyndns.info',
                path: `/sheylaweb/VALIDAR_EMPRESA.php?SERIE=${ruc}`
            };

            const callback = function(response){
                let str = '';

                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function () {

                    if(str.includes('NOEXISTE')){
                        resolve({
                            isSucess: false,
                            existEmp: false,
                            message: 'No existe la empresa'
                        });
                        return;
                    }

                    if(str.includes('***OK')){
                        resolve({
                            isSucess: true,
                            existEmp: true,
                            value: ((str.split(',')[1]).trim()).replace(/\*/g, '') //str
                        });
                        return;
                    }

                });
            }

            httpClient.request(options, callback).end();

        }catch(exception){
           reject({
                isSucess: false,
                message: 'inside error requuest http service'
            });
        }
    });
}

exports.validateDefaultUserByRuc = function(ruc){
    return new Promise(async (resolve, reject) => {
        try{
            getNameBdByRuc(ruc).then(
                async function(result){
                    if(!result.existEmp){
                        resolve(result);
                        return;
                    }

                    // OBTENER EL VALOR DEL NOMBRE DE LA EMPRESA Y CONSULTAR SI EXISTE EL USUARIO DEFAUULT
                    let nombreBd = result.value
                    
                    let queryEmpresas = `SELECT * FROM ${nombreBd}.empresas WHERE emp_ruc = ? LIMIT 1`;
                    let query = `SELECT * FROM ${nombreBd}.usuarios WHERE usu_username = "ADMIN" AND usu_password = "ADMIN" AND usu_empresa_id = ? LIMIT 1`;

                    let resultEmpresa = await poolMysql.query(queryEmpresas, [ruc]);
                    
                    if(!resultEmpresa[0] | !resultEmpresa[0].length){
                        reject(' error, no se encontro la empresa');
                        return;
                    }

                    let idEmpresa = resultEmpresa[0][0].EMP_ID;
                    let results = await poolMysql.query(query, [idEmpresa]);

                    if(!results[0] | !results[0].length){
                        resolve({
                            isSuccess: true,
                            existDefaultUser: false
                        });
                        return;
                    }
                                
                    resolve({
                        isSuccess: true,
                        existDefaultUser: true
                    });

                },
                
                function(error){
                    reject(error);
                }
            );
        }catch(exception){
            console.log(exception);
            reject({
                isSucess: false,
                message: 'error validando ruc usuario default'
            });
        }
    });
}

