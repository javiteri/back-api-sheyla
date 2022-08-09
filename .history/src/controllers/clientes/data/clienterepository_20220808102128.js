const pool = require('../../../connectiondb/mysqlconnection')

exports.getListClientes = async (limit) => {
    

    return new Promise((resolve, reject) => {
        /*setTimeout(() => {

            try{
                
                listClientes = pool.query(`SELECT * FROM clientes ORDER BY cli_id DESC LIMIT ${limit}`);    
                resolve(listClientes)
            }catch(e){
                resolve('error: ' + e)
            }

        }, 2000)*/

        try{
                
            listClientes = pool.query(`SELECT * FROM clientes ORDER BY cli_id DESC LIMIT ${limit}`);    
            resolve(listClientes)
        }catch(e){
            resolve('error: ' + e)
        }
    });

    /*var listClientes = null
    try{

        listClientes = pool.query(`SELECT * FROM clientes LIMIT ${limit}`);
            return listClientes;
        
    }catch(e){
        console.log('error en select clientes')
    }*/

}

