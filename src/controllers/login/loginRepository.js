const poolMysql = require('../../connectiondb/mysqlconnection');
const poolMysqlBd1 = require('../../connectiondb/mysqlconnectionlogin');

const httpClient = require('http');

exports.loginUser = function(user, password){
    return new Promise((resolve, reject) => {
        try{
            
            let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
            
            poolMysql.query(query, [user, password], function(err, results, fields) {

                                if(err){
                                    reject('error: ' + err);
                                    return;
                                }

                                if(!results | results == undefined | results == null){
                                    reject('error no existe usuario');
                                    return;
                                }
                            
                                let userMysqlData; 
    
                                Object.keys(results).forEach(function(key){
                                    let row = results[key]
                                    userMysqlData = {
                                        'cedula': row.USU_CEDULA,
                                        'nombre': row.USU_NOMBRE_USUARIO    
                                    }
                                });
                                
                                resolve(userMysqlData)                            
                            }
            );
    
        }catch(error){
            resolve(`error query user login ${error}`)
        }
    })
}

exports.loginValidateExistEmpresaRucBd1 = function(ruc){
    
    return new Promise((resolve, reject) => {
        try {
            let query = "SELECT * FROM empresas WHERE empresa_ruc = ? LIMIT 1";
    
            poolMysqlBd1.query(query, [ruc], function(err, results, fields){

                    if(err){
                        reject('error en verify: ' + err);
                        return;
                    }

                    if(!results | results == undefined | results == null | !results.length){
                        reject('no existe empresa');
                        return;
                    }
                    

                    let existEmpresaResponse;

                    Object.keys(results).forEach(function(key){
                        let row = results[key]
                        existEmpresaResponse = {
                            'isSuccess': true,
                            'ruc': ruc,
                            'nombre': row.EMPRESA_NOMBRE,
                            'finFacturacion': row.EMPRESA_FECHA_FIN_FACTURACION
                        }
                    });

                    
                    if(new Date(existEmpresaResponse.finFacturacion) >= new Date()){
                        existEmpresaResponse['isFacturacionAvailable'] = true;
                    }else{
                        existEmpresaResponse['isFacturacionAvailable'] = false;
                    }

                    resolve(existEmpresaResponse);
                }
            );

        }catch(error){
            reject('error en verify empresa');
        }
    });

}

exports.loginAndValidateEmp = function(ruc, username, password){
    return new Promise((resolve, reject) => {
        try{

            getNameBdByRuc(ruc).then(
                function(result){
                    if(!result.existEmp){
                        resolve(result);
                        return;
                    }
                    // CONSULTAR SI EXISTE EL USUARIO Y CONTRASENA
                    let queryNumDocAndLicenceDays = `SELECT empresa_web_plan_enviados as emitidos,empresa_fecha_fin_facturacion as finfactura FROM
                        efactura_web.empresas,efactura_factura.empresas WHERE efactura_web.empresas.EMP_RUC
                        = efactura_factura.empresas.EMPRESA_RUC AND
                        efactura_web.empresas.EMP_RUC= ?`;
    
                    poolMysqlBd1.query(queryNumDocAndLicenceDays, [ruc], (err, results) => {

                        if(err){
                            reject({
                                isSucess: false,
                                code: 400,
                                messageError: err
                            });
                            return;
                        }
                        
                        const dateActual = new Date();
                        const dateInit = new Date(results[0].finfactura); 

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

                        let queryEmpresas = "SELECT * FROM empresas WHERE emp_ruc = ? LIMIT 1";
                        let query = 'SELECT * FROM usuarios WHERE usu_username = ? AND usu_password = ? AND usu_empresa_id = ? LIMIT 1';
                        
                        poolMysql.query(queryEmpresas, [ruc], function(err, resultEmpresa, fields){

                            if(err){
                                reject('error en BD2');
                                return;
                            }

                            if(!resultEmpresa | resultEmpresa == undefined | resultEmpresa == null | !resultEmpresa.length){
                                reject(' error, no se encontro la empresa');
                                return;
                            }

                            let idEmpresa;
                            let nombreEmpresa;
                            Object.keys(resultEmpresa).forEach(function(key) {
                                idEmpresa = resultEmpresa[key].EMP_ID;
                                nombreEmpresa = resultEmpresa[key].EMP_NOMBRE;
                            });

                            poolMysql.query(query, [username, password, idEmpresa], function(err, results, fields) {

                                if(err){
                                    reject('error: ' + err);
                                    return;
                                }


                                if(!results | results == undefined | results == null | !results.length){
                                    resolve({
                                        isSuccess: true,
                                        existUser: false
                                    });
                                    return;
                                }
                                
                                let idUsuario;
                                let nombreUsuario;
                                Object.keys(results).forEach(function(key){
                                    let row = results[key]
                                    idUsuario = row.usu_id;
                                    nombreUsuario = row.usu_nombres;
                                });
                                
                                resolve({
                                    isSuccess: true,
                                    existUser: true,
                                    idUsuario: idUsuario,
                                    nombreUsuario: nombreUsuario,
                                    idEmpresa: idEmpresa,
                                    nombreEmpresa: nombreEmpresa,
                                    rucEmpresa: ruc,
                                    redirectToHome: true
                                })
                            }
                        );


                        });

                    });
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

exports.loginValidateEmpresaAndUser = function(ruc, user, password){

    return new Promise((resolve, reject) => {

        try{

            let query = "SELECT * FROM empresas WHERE emp_ruc = ? LIMIT 1";
            let queryUser = "SELECT * FROM usuarios WHERE usu_username = ? AND usu_password = ? AND usu_empresa_id = ? LIMIT 1";

            let queryInsertEmpresa = "INSERT INTO empresas (emp_ruc, emp_nombre, emp_fecha_inicio) VALUES (?, ?, ?)";
            let queryInsertUserDefaultEmpresa = `INSERT INTO usuarios (usu_empresa_id, usu_identificacion, usu_nombres, usu_telefonos,usu_direccion, 
                                                usu_mail, usu_fecha_nacimiento, usu_username, usu_password, usu_permiso_escritura)
                                                VALUES (?,?,?,?,?,?,?,?,?,?)`;

            poolMysql.query(query, [ruc], function(err, results, fields){

                if(err){
                    reject('error en BD2');
                    return;
                }

                if(!results | results == undefined | results == null | !results.length){

                    // INSERT DEFAULT DATA IN EMPRESA AND USUARIOS "ADMIN" "ADMIN"
                    poolMysql.getConnection(function(err, connection){
                        
                        connection.beginTransaction(function(error){
                            if(error){
                                connection.rollback(function(){
                                    connection.release();
                                    reject('error en conexion transaction');
                                    return;
                                });

                            } else {

                                const fechaActual = new Date().toISOString().split('T')[0].toString();
                                
                                connection.query(queryInsertEmpresa, [ruc, "Nueva Empresa", fechaActual], function(err, resultsEmpresa){
                                    
                                    if(err) {
                                        connection.rollback(function(){ connection.release()});
                                        reject('error insertando nueva empresa');
                                        return;
                                    } else {
                                        
                                        connection.query(queryInsertUserDefaultEmpresa, 
                                            [resultsEmpresa.insertId, '9999999999','Usuario Default','', '', '', '2000-01-01', 'ADMIN', 'ADMIN', 1], 
                                            function(err, resultsUser){

                                            if(err){
                                                connection.rollback(function(){ connection.release()});
                                                reject('error insertando usuario: ' + err);
                                                return;
                                            }else{
                                                
                                                connection.commit(function(err){ 
                                                    if(err){
                                                        connection.rollback(function() {
                                                            connection.release();
                                                            reject('error insertando usuario: ' + err);
                                                            return;
                                                            //Failure
                                                        });
                                                    }else{
                                                        connection.release()

                                                        resolve({
                                                            isSuccess: true,
                                                            message: 'datos insertados (empresa, usuario)',
                                                            idUsuario: resultsUser.insertId,
                                                            nombreUsuario: 'Usuario Default',
                                                            idEmpresa: resultsEmpresa.insertId,
                                                            nombreEmpresa: 'Nueva Empresa',
                                                            rucEmpresa: ruc,
                                                            redirecRegistroEmp: true,
                                                            firstInserted: true
                                                        })

                                                        return;
                                                    }
                                                });
                                            }

                                        });
                                    }

                                });
                            }
                            
                        });
                    });

                }else{
                    
                    let idEmpresa;
                    let nombreEmpresa;
                    Object.keys(results).forEach(function(key) {
                        idEmpresa = results[key].EMP_ID;
                        nombreEmpresa = results[key].EMP_NOMBRE;
                    });
                    
                    // VALIDATE IF USER EXISTS
                    poolMysql.query(queryUser, [user, password, idEmpresa], function(error, resultado, campos){
                        
                        if(error){
                            reject('ocurrio un error: ' + err);
                            return;
                        }
                        
    
                        if(!resultado.length){
                            reject('no existe el usuario');
                            return;
                        }
                        if(results.length && !resultado.length){
                            reject('no existe el usuario');
                            return;
                        }

                    
                        let idUsuario;
                        let nombreUsuario;
                        Object.keys(resultado).forEach(function(key) {
                            idUsuario = resultado[key].usu_id;
                            nombreUsuario = resultado[key].usu_nombres
                        });

                        //EXISTE EL USUARIO
                        resolve({
                            isSuccess: true,
                            message: 'ruc y usuario validado correctamente',
                            idUsuario: idUsuario,
                            nombreUsuario: nombreUsuario,
                            idEmpresa: idEmpresa,
                            nombreEmpresa: nombreEmpresa,
                            rucEmpresa: ruc,
                            redirectToHome: true
                        });
                    });
                }

            });

        }catch(error){
            reject('error en verificar usuario y empresa');
        }

    });
    
}


exports.createEmpresaByRuc = function(ruc){
    return new Promise((resolve, reject) => {
        try{
            //PARA NUEVA EMPRESA http://sheyla2.dyndns.info/sheylaweb/CREAR_EMPRESA.php?SERIE=1718792656001

            console.log(ruc);
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
                    console.log('inside end');
                    console.log(str);
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
            
                            response.on('end', function () {
            
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
                                    poolMysql.query(querySelectEmpresa, [ruc], function(err, results, fields){
                                                    
                                                    if(err){
                                                        reject('error en BD2');
                                                        return;
                                                    }
                        
                                                    let idEmpresa;
                                                    Object.keys(results).forEach(function(key) {
                                                        idEmpresa = results[key].EMP_ID;
                                                    });

                                                    poolMysql.query(queryInsertUserDefaultEmpresa, 
                                                        [idEmpresa, '9999999999','Usuario Default','', '', '', '2000-01-01', 'ADMIN', 'ADMIN', 1], 
                                                        function(err, resultsUser){
                        
                                                        if(err){
                                                            reject('error insertando usuario: ' + err);
                                                            return;
                                                        }

                                                        resolve({
                                                            isSucess: true,
                                                            isCreateEmp: true,
                                                            username: 'ADMIN',
                                                            password: 'ADMIN',
                                                            rucEmpresa: ruc
                                                        });
                        
                                                    });
                        
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
        
                response.on('end', function () {
        
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
                            let queryUser = "SELECT * FROM usuarios WHERE usu_empresa_id = ? AND usu_permiso_escritura = 1 LIMIT 1";

                            params = [ruc,email];

                            poolMysql.query(querySelectEmpresa, params, function(err, results, fields){
                                if(err){
                                    reject('error en BD2');
                                    return;
                                }
                                let idEmpresa;
                                Object.keys(results).forEach(function(key) {
                                    idEmpresa = results[key].EMP_ID;
                                });
    
                                if(results.length === 0 ){
                                    resolve({
                                        isSucess: false,
                                        existEmpresa: false
                                    });
                                    return;
                                }
                                
                                poolMysql.query(queryUser,[idEmpresa],function(error, result){
                                    if(error){
                                        reject('Error obteniendo usuarios');
                                        return;
                                    }

                                    if(!result && result.length === 0 ){
                                        resolve({
                                            isSucess: false,
                                            existEmpresa: false,
                                            message: 'no se encontro usuario predeterminado para empresa'
                                        });
                                        return;
                                    }

                                    /// SEND EMAIL TO URL FOR RECOVERY PASSWORD
                                    sendEmailRecoveryAccount(ruc, email,result[0], resolve, reject);

                                });
                
                            });


                        }else{
                            querySelectEmpresa = `SELECT * FROM ${dbName}.empresas WHERE emp_ruc = ? LIMIT 1`;
                            params = [ruc];
                            
                            poolMysql.query(querySelectEmpresa, params, function(err, results, fields){
                                if(err){
                                    reject('error en BD2');
                                    return;
                                }

                                if(!results | results == undefined | results == null | !results.length){
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
                            value: str
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
    return new Promise((resolve, reject) => {
        try{
            getNameBdByRuc(ruc).then(
                function(result){
                    if(!result.existEmp){
                        resolve(result);
                        return;
                    }

                    // OBTENER EL VALOR DEL NOMBRE DE LA EMPRESA Y CONSULTAR SI EXISTE EL USUARIO DEFAUULT
                    
                    let nombreBd = (result.value.trim().replace(/\*/g," ")).split(",")[1];
                    
                    let queryEmpresas = `SELECT * FROM ${nombreBd}.empresas WHERE emp_ruc = ? LIMIT 1`;
                    let query = `SELECT * FROM ${nombreBd}.usuarios WHERE usu_username = "ADMIN" AND usu_password = "ADMIN" AND usu_empresa_id = ? LIMIT 1`;
                    
                    poolMysql.query(queryEmpresas, [ruc], function(err, resultEmpresa, fields){
                        if(err){
                            console.log(error);
                            reject('error en BD2');
                            return;
                        }

                        if(!resultEmpresa | resultEmpresa == undefined | resultEmpresa == null | !resultEmpresa.length){
                            reject(' error, no se encontro la empresa');
                            return;
                        }

                        let idEmpresa;
                        let nombreEmpresa;
                        Object.keys(resultEmpresa).forEach(function(key) {
                                idEmpresa = resultEmpresa[key].EMP_ID;
                                nombreEmpresa = resultEmpresa[key].EMP_NOMBRE;
                        });
                        console.log(idEmpresa);

                        poolMysql.query(query, [idEmpresa], function(err, results, fields) {
                                if(err){
                                    reject('error: ' + err);
                                    return;
                                }

                                if(!results | results == undefined | results == null | !results.length){
                                    resolve({
                                        isSuccess: true,
                                        existDefaultUser: false
                                    });
                                    return;
                                }
                                
                                resolve({
                                    isSuccess: true,
                                    existDefaultUser: true
                                })

                            }
                        );
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

