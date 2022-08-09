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

exports.loginValidateExistsClientRuc = function(ruc){
    
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
