var mysql = require('mysql')
var util = require('util')

var pool = mysql.createPool({
    connectinoLimit: 10,
    host: 'sheyla2.dyndns.info',//'sheyla.dyndns.info',
    user: 'efactura_web',
    password: 'm10101417M210101418',
    database: 'efactura_web'//'database_new_empresa'
})

pool.getConnection((err, connection) => {
    if(err){
        if(err.code === 'PROTOCOL_CONNECTION_LOST'){
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        }
    }
    if(err){
        console.error('Eror al conectar: ' + err);
    }

    if(connection) connection.release()

    return
})

pool.query = util.promisify(pool.query).bind(pool)

module.exports = pool