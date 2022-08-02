const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {

    try{
        console.log(`user ${user}`);
        console.log(`pass ${password}`);
        
        let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
        poolMysql.query(query, [user, password], function(err, results, fields) {

                            if(!results){
                                return
                            }

                            let userMysqlData 

                            Object.keys(results).forEach(function(key){
                                var row = results[key]
                                console.log(row.USU_NOMBRE_USUARIO)
                            });
                            
                            return null;
                        }
        )

    }catch(error){
        console.log(`error query user login ${error}`)
    }
    
    //return userSelect;
}