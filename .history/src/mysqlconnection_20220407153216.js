var mysql = require('mysql')

var pool = msyql.createPool({
    connectinoLimit: 10,
    host: 'sheyla.dyndns.info'
})