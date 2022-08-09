const poolMysql = require('../../connectiondb/mysqlconnection');
const poolMysqlBd1 = require('../../connectiondb/mysqlconnectionlogin');


exports.loginUser = function(user, password){
    return new Promise((resolve, reject) => {
        try{
            console.log(`user ${user}`);
            console.log(`pass ${password}`);
            
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

exports.loginValidateExistsClientRuc = async function(ruc){
    
    return new Promise((resolve, reject) => {
        try {
            let query = "SELECT * FROM empresas WHERE empresa_ruc == ?";
    
    
            poolMysqlBd1.query(query, [ruc], function(err, results, fields){
    
                if(!results | results == undefined | results == null){
                    return reject(' no existe empresa');
                }
    
            });
    
        }catch(error){
            console.log('inside catch error verify empresa');
            reject('error en verify empresa')
        }
    })

}
