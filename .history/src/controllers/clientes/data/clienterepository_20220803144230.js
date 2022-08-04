const pool = require('../../../connectiondb/mysqlconnection')

exports.getListClientes = async (limit) => {
    const listClientes = pool.query(`SELECT cli_cedula FROM clientes LIMIT ${limit}`);

    return listClientes;
}