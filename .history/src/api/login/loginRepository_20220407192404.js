const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {

    console.log(`user ${user}`);
    console.log(`password ${password}`);


    var userSelect = null 
    try{
        poolMysql.query('SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1', [user, password], 
            function(err, results, fields){
                console.log('response mysql')
                console.log(err)
                console.log(results)
                //console.log(fields)
            }
        );

    }catch(error){
        console.log(`error query user login ${error}`)
    }
    
    return userSelect;
}