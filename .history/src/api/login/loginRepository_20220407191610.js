const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {

    console.log(`user ${user}`);
    console.log(`password ${password}`);


    var userSelect = null 
    try{
        await poolMysql.query(`SELECT * FROM usuarios WHERE usu_nombre_usuario = ${user} AND usu_password = ${password} LIMIT 1`);
    }catch(error){
        console.log('error query user login')
    }
    
    return userSelect;
}