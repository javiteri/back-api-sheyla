const poolMysql = require('../../connectiondb/mysqlconnection');


const loginUser = async function(user, password){
    try{
        console.log(`user ${user}`);
        console.log(`pass ${password}`);
        
        let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
        
        poolMysql.query(query, [user, password], function(err, results, fields) {

                            if(!results){
                                return
                            }

                            let userMysqlData; 

                            Object.keys(results).forEach(function(key){
                                var row = results[key]
                                userMysqlData = {
                                    'cedula': row.USU_CEDULA,
                                    'nombre': row.USU_NOMBRE_USUARIO    
                                }
                            });
                            
                            console.log(`usermysqlData: ${userMysqlData.cedula}`)

                            return userMysqlData;
                        }
        ).then((data) => {
            console.log('inside promise')
        })

        //console.log(`result ${result}`)
        //return result

    }catch(error){
        console.log(`error query user login ${error}`)
    }
}


exports.login = loginUser