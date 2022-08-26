const pool = require('../../../connectiondb/mysqlconnection');

exports.getListProductosByIdEmp = async (idEmpresa) => {

    return new Promise((resolve, reject) => {
        try {
            
            let querySelectProductosByIdEmp = 'SELECT * FROM productos WHERE prod_empresa_id = ?';
            pool.query(querySelectProductosByIdEmp, [idEmpresa], function (error, results, fields){

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: err
                    });
                    return;
                }

                resolve({
                    isSucess: true,
                    code: 200,
                    data: results
                });


            });
        }catch(err) {
            reject({
                isSucess: false,
                code: 400,
                messageError: err
            });
        }
    });
}

exports.getProductoByIdEmp = async (idProducto, idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectProducto = `SELECT * FROM productos WHERE prod_empresa_id = ? AND prod_id = ? LIMIT 1`
            
            pool.query(querySelectProducto, [idEmpresa, idProducto], (err, results) => {

                if(err){
                    reject({
                        isSucess: false,
                        code: 400,
                        message: err
                    });
                    return;
                }
                
                if(!results | results == undefined | results == null | !results.length){
                    resolve({
                        isSucess: true,
                        code: 400,
                        message: 'no se encontro producto'
                    });

                    return;
                }

                resolve({
                    isSucess: true,
                    code: 200,
                    data: results
                });

            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}