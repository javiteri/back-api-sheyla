const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {

    console.log(`user ${user}`);
    console.log(`password ${password}`);

    const userSelect = await poolMysql.query(`SELECT * FROM usuarios WHERE usu_nombre_usuario = ${user} AND usu_password = ${password} LIMIT 1`);
    return userSelect;
}