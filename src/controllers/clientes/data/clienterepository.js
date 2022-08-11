const pool = require('../../../connectiondb/mysqlconnection')

exports.getListClientes = async (limit) => {
    

    return new Promise((resolve, reject) => {
        
        try{
                
            listClientes = pool.query(`SELECT * FROM clientes ORDER BY cli_id DESC LIMIT ${limit}`);    
            resolve(listClientes)
        }catch(e){
            resolve('error: ' + e)
        }
    });    

}