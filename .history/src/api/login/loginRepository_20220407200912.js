const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {

    var userSelect = null 
    try{
        console.log(`user ${user}`);
        console.log(`pass ${password}`);
        
        let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ?';
        poolMysql.query(query, [user, password], function(err, results, fields) {
                            console.log('response mysql')
                            console.log(err)
                            console.log(results)

                            if(!result){
                                return userSelect
                            }

                            userSelect = {
                                'id': results.usu_cedula,
                                'nombre': results.usu_nombre_usuario
                            }

                            return userSelect
                        }
        )

    }catch(error){
        console.log(`error query user login ${error}`)
    }
    
    //return userSelect;
}