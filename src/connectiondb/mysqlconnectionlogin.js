const mysql = require('mysql');
var util = require('util');

var pool = mysql.createPool({
    connectionLimit: 20,
    host: process.env.hostDb,
    user: process.env.dbUsername,
    password: process.env.dbPassword,
    database: process.env.dbEFacturaFactura
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


pool.query = util.promisify(pool.query).bind(pool);

module.exports = pool