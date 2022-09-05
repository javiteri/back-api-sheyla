const pool = require('../../../connectiondb/mysqlconnection');

exports.getListProductosByIdEmp = async (idEmpresa) => {

    return new Promise((resolve, reject) => {
        try {
            
            let querySelectProductosByIdEmp = 'SELECT * FROM productos WHERE prod_empresa_id = ? ORDER BY prod_id DESC LIMIT 1000';
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

exports.insertPoducto = async (datosProducto) => {
    return new Promise((resolve, reject ) => {
        try{

            const {idEmpresa, codigo, codigoBaras, nombre, pvp, 
                costo, utilidad, stock, unidadMedida, iva, activo, 
                categoria, marca, observacion} = datosProducto;
            
            //let queryExistProveedor = "SELECT COUNT(*) AS CANT FROM productos WHERE prod_empresa_id = ? AND pro_documento_identidad = ?";
            let queryInsertProducto = `INSERT INTO productos (prod_empresa_id, prod_codigo, prod_codigo_barras, 
                                        prod_nombre, prod_costo, prod_utilidad, prod_pvp, prod_iva_si_no, prod_stock,prod_unidad_medida, 
                                        prod_observaciones, pro_categoria, prod_marca, prod_activo_si_no) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                                        
            pool.query(queryInsertProducto, [idEmpresa, codigo, codigoBaras?codigoBaras:'', nombre, costo,
                                            utilidad, pvp, iva, stock?stock:'0', unidadMedida, observacion, 
                                            categoria, marca, activo], function (error, result){

                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: error
                    });
                    return;
                }

                const insertId = result.insertId;
                let insertProductoResponse = {}
                if(insertId > 0){
                    insertProductoResponse['isSucess'] = true;
                }else{
                    insertProductoResponse['isSucess'] = false;
                    insertProductoResponse['message'] = 'error al insertar Producto';
                }

                resolve(insertProductoResponse);
        });

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.updateProducto = async (datosProducto) => {
    return new Promise((resolve, reject) => {
        try{

            const {idEmpresa, idProducto, codigo, codigoBaras, nombre, pvp,
                costo, utilidad, stock, unidadMedida, iva, activo,
                categoria, marca, observacion} = datosProducto;
            
            let queryUpdateProducto = `UPDATE productos SET prod_codigo = ?, 
                                        prod_codigo_barras = ?, prod_nombre = ?, prod_costo = ?, prod_utilidad = ?, 
                                        prod_pvp = ?, prod_iva_si_no = ?, prod_stock = ?, prod_unidad_medida = ?, 
                                        prod_observaciones = ?, pro_categoria = ?, prod_marca = ?, prod_activo_si_no = ?            
                                        WHERE prod_id = ? AND prod_empresa_id = ?`;
            
            pool.query(queryUpdateProducto, [codigo, codigoBaras?codigoBaras:'', nombre, 
                costo, utilidad, pvp, iva, stock?stock:'0', unidadMedida, observacion, categoria, marca, 
                activo, idProducto, idEmpresa], 
                        function (error, result){
                        
                            if(error){
                                console.log(error);

                                reject({
                                    isSucess: false,
                                    code: 400,
                                    message: error
                                });
                                return;
                            }
                            const insertId = result.affectedRows;
                            let insertProductoResponse = {}
                            if(insertId > 0){
                                insertProductoResponse['isSucess'] = true;
                            }else{
                                insertProductoResponse['isSucess'] = false;
                                insertProductoResponse['message'] = 'error al actualizar producto';
                            }
                            resolve(insertProductoResponse);
                            return;
                        });

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.deleteProducto = async (idEmpresa, idProducto) => {
    return new Promise((resolve, reject) => {
        try {
            let queryDeleteProducto = 'DELETE FROM productos WHERE  prod_empresa_id = ? AND prod_id = ? LIMIT 1';

            pool.query(queryDeleteProducto, [idEmpresa, idProducto], function(error, results, fields){
                if(error){
                    reject({
                        isSucess: false,
                        code: 400,
                        message: error.message
                    });
                    return;
                }

                const affectedRows = results.affectedRows;
                if(affectedRows === 1){

                    const deleteProductoResponse = {
                        'isSucess': true
                    }
    
                    resolve(deleteProductoResponse);
                    return;

                }else{
                    reject({
                        isSucess: false,
                        code: 400,
                        message: 'error al eliminar producto, reintente',
                        duplicate: true
                    });
                    return;
                }
            });

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.getCategoriasByIdEmp = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectCategoriasProducto = `SELECT DISTINCT pro_categoria FROM productos WHERE prod_empresa_id = ? AND pro_categoria IS NOT NULL 
                                                ORDER BY pro_categoria`
            
            pool.query(querySelectCategoriasProducto, [idEmpresa], (err, results) => {

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
                        code: 200,
                        message: 'no se encontro categorias'
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

exports.getMarcasByIdEmp = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectMarcasProducto = `SELECT DISTINCT prod_marca FROM productos WHERE prod_empresa_id = ? AND prod_marca IS NOT NULL 
                                                ORDER BY prod_marca`
            
            pool.query(querySelectMarcasProducto, [idEmpresa], (err, results) => {

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
                        code: 200,
                        message: 'no se encontro marcas'
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

exports.searchProductosByIdEmp = async (idEmpresa, textSearch) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySearchClientes = `SELECT * FROM productos WHERE prod_empresa_id = ? AND (prod_nombre LIKE ? || prod_codigo LIKE ?)
                                         ORDER BY prod_id DESC`
            
            pool.query(querySearchClientes, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%'], (err, results) => {

                if(err){
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

        }catch(e){
            reject('error: ' + e);
        }
    });    

}