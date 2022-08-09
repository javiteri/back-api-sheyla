const poolMysql = require('../../connectiondb/mysqlconnection');


const loginUser = function(user, password){
    return new Promise((resolve, reject) => {
        try{
            console.log(`user ${user}`);
            console.log(`pass ${password}`);
            
            let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
            
            poolMysql.query(query, [user, password], function(err, results, fields) {


                                if(err){
                                    console.log('error en repository');
                                    resolve(err);
                                    return;
                                }

                                if(!results | results == undefined | results == null){
                                    resolve('error no existe usuario');
                                    return;
                                }
                            
                                console.log('before user mysqlData');
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
            )
    
        }catch(error){
            resolve(`error query user login ${error}`)
        }
    })
}


exports.login = loginUser