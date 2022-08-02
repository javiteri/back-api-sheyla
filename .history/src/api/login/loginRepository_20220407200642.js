const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {

    var userSelect = null 
    try{
        console.log(`user ${user}`);
        console.log(`pass ${password}`);
        
        let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ?';
        poolMysql.query(query, [user], function(err, results, fields) {
                            console.log('response mysql')
                            console.log(err)
                            console.log(results)
                        }
        )    

    }catch(error){
        console.log(`error query user login ${error}`)
    }
    
    return userSelect;
}