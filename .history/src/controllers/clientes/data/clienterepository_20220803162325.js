const pool = require('../../../connectiondb/mysqlconnection')

exports.getListClientes = async (limit) => {
    const listClientes = pool.query(`SELECT cli_cedula, cli_nombre, cli_email, cli_tipo_id, cli_telefonos, cli_nacionalidad FROM clientes LIMIT ${limit}`);

    return listClientes;
}