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
                                    var row = results[key]
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
                        var row = results[key]
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

            // HACER UN REQUEST A http://sheyla2.dyndns.info/sheylaweb/VALIDAR_EMPRESA.php?SERIE=1718792656001
            var options = {
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
                        // CONSULTAR SI EXISTE EL USUARIO Y CONTRASENA

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

                                console.log(username);
                                console.log(password);
                                console.log(idEmpresa);
                                console.log(results);
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
                                    var row = results[key]
                                    idUsuario = row.usu_id;
                                    nombreUsuario = row.usu_nombres;
                                });
                                
                                console.log(nombreEmpresa);
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

                    }

                });
            }

            httpClient.request(options, callback).end();
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
                    console.log(results);
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

            var options = {
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
                    if(str.includes('YAEXISTE')){
                        resolve({
                            isSucess: true,
                            existEmp: true,
                            message: 'la empresa ya existe'
                        });
                        return;
                    }

                    if(str.includes('NUEVAEMPRESAOK')){

                        var options1 = {
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
                                    
                                    console.log(str1);
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