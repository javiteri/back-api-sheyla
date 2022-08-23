const poolMysql = require('../../connectiondb/mysqlconnection');
const poolMysqlBd1 = require('../../connectiondb/mysqlconnectionlogin');


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

exports.loginValidateEmpresaAndUser = function(ruc, user, password){

    return new Promise((resolve, reject) => {

        try{

            let query = "SELECT * FROM empresas WHERE emp_ruc = ? LIMIT 1";
            let queryUser = "SELECT * FROM usuarios WHERE usu_username = ? AND usu_password = ? AND usu_empresa_id = ? LIMIT 1";

            let queryInsertEmpresa = "INSERT INTO empresas (emp_ruc, emp_nombre, emp_fecha_inicio) VALUES (?, ?, ?)";
            let queryInsertUserDefaultEmpresa = `INSERT INTO usuarios (usu_empresa_id, usu_identificacion, usu_nombres, usu_telefonos,usu_direccion, 
                                                usu_mail, usu_fecha_nacimiento, usu_username, usu_password, usu_permiso_escritura)
                                                VALUES (?,?,?,?,?,?,?,?,?)`;

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
                                    //FAILURE
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
                                                        console.log('idGeneratedUser: ' + resultsUser.insertId);

                                                        resolve({
                                                            isSuccess: true,
                                                            message: 'datos insertados (empresa, usuario)',
                                                            idUsuario: resultsUser.insertId,
                                                            idEmpresa: resultsEmpresa.insertId,
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
                    Object.keys(results).forEach(function(key) {
                        idEmpresa = results[key].EMP_ID;
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
                        Object.keys(resultado).forEach(function(key) {
                            idUsuario = results[key].usu_id;
                        });

                        //EXISTE EL USUARIO
                        resolve({
                            isSuccess: true,
                            message: 'ruc y usuario validado correctamente',
                            idUsuario: idUsuario,
                            idEmpresa: idEmpresa,
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
