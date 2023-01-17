const pool = require('../../../connectiondb/mysqlconnection');
const excelJS = require("exceljs");
const fs = require('fs');


exports.getListProductosByIdEmp = async (idEmpresa, nombreBd) => {

    return new Promise(async (resolve, reject) => {
        try {
            
            let querySelectProductosByIdEmp = `SELECT * FROM ${nombreBd}.productos WHERE prod_empresa_id = ? ORDER BY prod_id DESC `;
            let results = await pool.query(querySelectProductosByIdEmp, [idEmpresa]);

            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
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

exports.getListProductosNoAnuladoByIdEmp = async (idEmpresa, nombreBd) => {

    return new Promise(async (resolve, reject) => {
        try {
            
            let querySelectProductosByIdEmp = `SELECT * FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND prod_activo_si_no = ? ORDER BY prod_id DESC`;
            let results = await pool.query(querySelectProductosByIdEmp, [idEmpresa, 1]); 
            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
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

exports.getProductoByIdEmp = async (idProducto, idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectProducto = `SELECT * FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND prod_id = ? LIMIT 1`
            
            let results = await pool.query(querySelectProducto, [idEmpresa, idProducto]); 
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
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
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.insertPoducto = async (datosProducto) => {
    return new Promise(async (resolve, reject ) => {
        try{

            const {idEmpresa, codigo, codigoBarras, nombre, pvp, 
                costo, utilidad, stock, unidadMedida, iva, activo, 
                categoria, marca, observacion, tipoProducto, nombreBd} = datosProducto;
            
            let queryInsertProducto = `INSERT INTO ${nombreBd}.productos (prod_empresa_id, prod_codigo, prod_codigo_barras, 
                                        prod_nombre, prod_costo, prod_utilidad, prod_pvp, prod_iva_si_no, prod_stock,prod_unidad_medida, 
                                        prod_observaciones, pro_categoria, prod_marca, prod_activo_si_no, prod_fisico) 
                                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                                        
            let result = await pool.query(queryInsertProducto, [idEmpresa, codigo, codigoBarras?codigoBarras:'', nombre, costo,
                                            utilidad, pvp, iva, stock?stock:'0', unidadMedida, observacion, 
                                            categoria, marca, activo,tipoProducto]);
            console.log(result);                        
            const insertId = result.insertId;
            let insertProductoResponse = {}
            if(insertId > 0){
                insertProductoResponse['isSucess'] = true;
            }else{
                insertProductoResponse['isSucess'] = false;
                insertProductoResponse['message'] = 'error al insertar Producto';
            }

            resolve(insertProductoResponse);

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                messageError: error
            });
        }
    });
}

exports.importListProductos = async (listProductos, nombreBd, idEmpresa) => {
    return new Promise(async (resolve, reject ) => {
        try{
            let listProductosWithError = [];

            const selectExistProducto = `SELECT COUNT(*) AS CANT FROM ${nombreBd}.productos WHERE prod_codigo = ? AND prod_empresa_id = ?`;
            let queryInsertProducto = `INSERT INTO ${nombreBd}.productos (prod_empresa_id, prod_codigo, prod_codigo_barras, 
                prod_nombre, prod_costo, prod_utilidad, prod_pvp, prod_iva_si_no, prod_stock,prod_unidad_medida, 
                prod_observaciones, pro_categoria, prod_marca, prod_activo_si_no, prod_fisico) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            
            for(let index=0; index < listProductos.length; index++){
                try{

                    let producto = listProductos[index];
                    let existproductoResult = await pool.query(selectExistProducto, [producto.prod_codigo, idEmpresa]);
                    
                    const cantProducto = existproductoResult[0][0].CANT;
                    if(cantProducto >= 1){
                        let productoRes = producto;
                        productoRes.messageError = 'ya existe el producto';
                        productoRes.pro_error_server = true;
                        listProductosWithError.push(productoRes);
                    }else{
                        await pool.query(queryInsertProducto, [
                            idEmpresa, producto.prod_codigo, producto.prod_codigo_barras, producto.prod_nombre, 
                            producto.prod_costo, 
                            producto.prod_utilidad, producto.prod_pvp, producto.prod_iva_si_no, producto.prod_stock, producto.prod_unidad_medida, 
                            producto.prod_observaciones, 
                            producto.pro_categoria, producto.prod_marca, producto.prod_activo_si_no, 
                            1
                        ]);
                    }
                    
                    if(listProductos.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'productos Insertados Correctamente',
                            listProductosWithError: listProductosWithError
                        });
                    }

                }catch(exception){
                    let productoRes = producto;
                    productoRes.messageError = 'error al insertar producto';
                    productoRes.cli_error_server = true;
                    listProductosWithError.push(productoRes);

                    if(listProductos.length - 1 == index){
                        resolve({
                            isSucess: true,
                            message: 'productos Insertados Correctamente',
                            listProductosWithError: listProductosWithError
                        });
                    }
                }
            }
            
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
    return new Promise(async (resolve, reject) => {
        try{

            const {idEmpresa, idProducto, codigo, codigoBarras, nombre, pvp,
                costo, utilidad, stock, unidadMedida, iva, activo,
                categoria, marca, observacion, tipoProducto, nombreBd} = datosProducto;
            
            let queryUpdateProducto = `UPDATE ${nombreBd}.productos SET prod_codigo = ?, 
                                        prod_codigo_barras = ?, prod_nombre = ?, prod_costo = ?, prod_utilidad = ?, 
                                        prod_pvp = ?, prod_iva_si_no = ?, prod_stock = ?, prod_unidad_medida = ?, 
                                        prod_observaciones = ?, pro_categoria = ?, prod_marca = ?, prod_activo_si_no = ?,
                                        prod_fisico = ?           
                                        WHERE prod_id = ? AND prod_empresa_id = ?`;
            
            let result = await pool.query(queryUpdateProducto, [codigo, codigoBarras?codigoBarras:'', nombre, 
                costo, utilidad, pvp, iva, stock?stock:'0', unidadMedida, observacion, categoria, marca, 
                activo,tipoProducto, idProducto, idEmpresa]); 

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

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.deleteProducto = async (idEmpresa, idProducto, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        try {
            let queryDeleteProducto = `DELETE FROM ${nombreBd}.productos WHERE  prod_empresa_id = ? AND prod_id = ? LIMIT 1`;

            let results = await pool.query(queryDeleteProducto, [idEmpresa, idProducto]); 
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

        }catch(error){
            reject({
                isSucess: false,
                code: 400,
                message: error.message
            });
        }
    });
}

exports.getCategoriasByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectCategoriasProducto = `SELECT DISTINCT pro_categoria FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND pro_categoria IS NOT NULL 
                                                ORDER BY pro_categoria`
            
            let results = await pool.query(querySelectCategoriasProducto, [idEmpresa]); 
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
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
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.getMarcasByIdEmp = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectMarcasProducto = `SELECT DISTINCT prod_marca FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND prod_marca IS NOT NULL 
                                                ORDER BY prod_marca`
            
            let results = await pool.query(querySelectMarcasProducto, [idEmpresa]); 
            if(!results[0] | results[0] == undefined | results[0] == null | !results[0].length){
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
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.searchProductosByIdEmp = async (idEmpresa, textSearch, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySearchClientes = `SELECT * FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND (prod_nombre LIKE ? || prod_codigo LIKE ?)
                                         ORDER BY prod_id DESC`
            
            let results = await pool.query(querySearchClientes, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%']); 
            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.searchProductosByIdEmpActivo = async (idEmpresa, textSearch, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySearchClientes = `SELECT * FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND (prod_nombre LIKE ? || prod_codigo LIKE ?) AND prod_activo_si_no = ?
                                         ORDER BY prod_id DESC`
            
            let results = await pool.query(querySearchClientes, [idEmpresa, '%'+textSearch+'%', '%'+textSearch+'%', 1]); 
            resolve({
                isSucess: true,
                code: 200,
                data: results[0]
            });

        }catch(e){
            reject('error: ' + e);
        }
    });    

}

exports.getListProductosExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createExcelFileProductos(idEmpresa, nombreBd);
            valueResultPromise.then( 
                function (data) {
                    resolve(data);
                },
                function (error) {
                    resolve(error);
                }
            );
        }catch(exception){
            reject('error creando excel');
        }
    });
}

exports.getTemplateProductosExcel = async (idEmpresa, nombreBd) => {
    return new Promise((resolve, reject) => {
        try{
            const valueResultPromise = createTemplateProductosExcel(idEmpresa, nombreBd);
            valueResultPromise.then( 
                function (data) {
                    resolve(data);
                },
                function (error) {
                    resolve(error);
                }
            );
        }catch(exception){
            reject('error creando excel');
        }
    });
}


function createExcelFileProductos(idEmp, nombreBd){

    return new Promise(async (resolve, reject) => {
        try{

            let querySelectProducto = `SELECT * FROM ${nombreBd}.productos WHERE prod_empresa_id = ? AND prod_activo_si_no = ? ORDER BY prod_id DESC`
            
            let results = await pool.query(querySelectProducto, [idEmp, 1]);
                
                const arrayData = Array.from(results[0]);

                const workBook = new excelJS.Workbook(); // Create a new workbook
                const worksheet = workBook.addWorksheet("Lista Productos");
                const path = `./files/${idEmp}`;

                worksheet.columns = [
                    {header: 'Codigo', key:'codigo', width: 20},
                    {header: 'Codigo Barras', key:'codigobarras',width: 20},
                    {header: 'Nombre', key:'nombre',width: 50},
                    {header: 'Iva', key: 'iva', width: 20},
                    {header: 'Stock', key:'stock',width: 20},
                    {header: 'Unidad Medida', key:'unidad',width: 20},
                    {header: 'Categoria', key:'categoria',width: 20},
                    {header: 'Marca', key:'marca',width: 20}
                ];
            
                
                arrayData.forEach(valor => {
                    let valorInsert = {
                        codigo: valor.prod_codigo,
                        codigobarras: valor.prod_codigo_barras,
                        nombre: valor.prod_nombre,
                        iva: (valor.prod_iva_si_no == 1) ? "12.00" : "0.00" ,
                        stock: valor.prod_stock,
                        unidad: valor.prod_unidad_medida,
                        categoria: valor.pro_categoria,
                        marca: valor.prod_marca
                    }
                    worksheet.addRow(valorInsert);
                });

                // Making first line in excel
                worksheet.getRow(1).eachCell((cell) => {
                    cell.font = {bold: true},
                    cell.border = {
                        top: {style:'thin'},
                        left: {style:'thin'},
                        bottom: {style:'thin'},
                        right: {style:'thin'}
                    }
                });

                try{

                    const nameFile = `/${Date.now()}_productos.xlsx`;
            
                    if(!fs.existsSync(`${path}`)){
                        fs.mkdir(`${path}`,{recursive: true}, (err) => {
                            if (err) {
                                return console.error(err);
                            }
            
                            workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            
                                resolve({
                                    isSucess: true,
                                    message: 'archivo creado correctamente',
                                    pathFile: `${path}${nameFile}`
                                });

                            });
                        });
                    }else{
                        
                        workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            resolve({
                                isSucess: true,
                                message: 'archivo creado correctamente',
                                pathFile: `${path}${nameFile}`
                            });
                        });
                    }
            
                }catch(exception){
            
                    reject({
                        isSucess: false,
                        error: 'error creando archivo, reintente'
                    });
                }
        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo, reintente'
            });
        }
    });

}

function createTemplateProductosExcel(idEmp, nombreBd){

    return new Promise((resolve, reject) => {
        try{

            const workBook = new excelJS.Workbook(); // Create a new workbook
            const worksheet = workBook.addWorksheet("Lista Productos");
            const path = `./files/${idEmp}`;

            worksheet.columns = [
                {header: 'codigo', key:'codigo', width: 20},
                {header: 'nombre', key:'nombre',width: 50},
                {header: 'pvp', key:'pvp',width: 20},
                {header: 'stock', key:'stock',width: 20},
                {header: 'unidad_medida', key:'unidad_medida',width: 40},
                {header: 'iva', key:'iva',width: 20},
                {header: 'categoria', key:'categoria',width: 30},
                {header: 'marca', key:'marca',width: 30}
            ];

            worksheet.getRow(1).eachCell((cell) => {
                cell.font = {bold: true},
                cell.border = {
                    top: {style:'thin'},
                    left: {style:'thin'},
                    bottom: {style:'thin'},
                    right: {style:'thin'}
                }
            });

            try{

                const nameFile = `/${Date.now()}_productos_template.xlsx`;
        
                if(!fs.existsSync(`${path}`)){
                    fs.mkdir(`${path}`,{recursive: true}, (err) => {
                        if (err) {
                            return console.error(err);
                        }
        
                        workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                            resolve({
                                isSucess: true,
                                message: 'archivo creado correctamente',
                                pathFile: `${path}${nameFile}`
                            });

                        });
                    });
                }else{
                    
                    workBook.xlsx.writeFile(`${path}${nameFile}`).then(() => {
                        resolve({
                            isSucess: true,
                            message: 'archivo creado correctamente',
                            pathFile: `${path}${nameFile}`
                        });
                    });
                }
        
            }catch(exception){
                reject({
                    isSucess: false,
                    error: 'error creando archivo, reintente'
                });
            }
        }catch(exception){
            reject({
                isSucess: false,
                error: 'error creando archivo plantilla, reintente'
            });
        }
    });

}