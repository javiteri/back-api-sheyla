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
                        console.log('error' + err);
                    }

                    if(!results | results == undefined | results == null){
                        reject(' no existe empresa');
                        return;
                    }
                    
                    let existEmpresaResponse;

                    Object.keys(results).forEach(function(key){
                        var row = results[key]
                        existEmpresaResponse = {
                            'ruc': ruc,
                            'nombre': row.empresa_nombre,
                            'finFacturacion': row.empresa_fecha_fin_facturacion
                        }
                    });

                    const resultEmpresa = {
                        ciRuc: ruc,
                        
                    }


                    resolve('existe empresa');
                }
            );
    
        }catch(error){
            console.log('inside catch error verify empresa');
            reject('error en verify empresa');
        }
    });

}
