const poolMysql = require('../../connectiondb/mysqlconnection');


exports.login = async (user, password) => {
    const user = await poolMysql.query(`SELECT * FROM usuarios WHERE `)
    
}