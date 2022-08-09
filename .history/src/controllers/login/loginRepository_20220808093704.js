const poolMysql = require('../../connectiondb/mysqlconnection');


const loginUser = function(user, password){
    try{
        console.log(`user ${user}`);
        console.log(`pass ${password}`);
        
        let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
        
        return poolMysql.query(query, [user, password], function(err, results, fields) {

                            if(err){
                                throw new Error('ocurrio error');
                            }

                            if(!results | results == undefined | results == null){
                                throw new Error('no existe usuario');
                            }
                        

                            let userMysqlData; 

                            Object.keys(results).forEach(function(key){
                                var row = results[key]
                                userMysqlData = {
                                    'cedula': row.USU_CEDULA,
                                    'nombre': row.USU_NOMBRE_USUARIO    
                                }
                            });
                            
                            return userMysqlData
                        }
        )

    }catch(error){
        console.log('inside catch: ' + error);
    }
}


exports.login = loginUser