const pool = require('../../../mysqlconnection')

exports.getListClientes = async (limit) => {
    const listClientes = await pool.query(`SELECT * FROM clientes LIMIT ${limit}`);

    return listClientesl;
}