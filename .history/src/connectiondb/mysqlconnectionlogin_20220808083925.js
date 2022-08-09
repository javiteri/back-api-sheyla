const mysql = require('mysql');
var util = require('util');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'sheyla2.dyndns.info',//'sheyla.dyndns.info',
    user: 'efactura_web',
    password: 'm10101417M210101418',
    database: 'efactura_factura'//'database_new_empresa'
})