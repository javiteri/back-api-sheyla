const pool = require('../../../connectiondb/mysqlconnection');

exports.getInfoVentaDiaria = async (idEmpresa, fechaIni,fechaFin) => {
    return new Promise((resolve, reject) => {

        console.log('inside info diairia');
        try{
            let querySelectVentaDiaria = `SELECT SUM(venta_total) AS 'total' FROM ventas WHERE venta_empresa_id= ? AND
                                    venta_fecha_hora BETWEEN ? AND ? AND
                                    venta_anulado=0`
            
            pool.query(querySelectVentaDiaria, [idEmpresa, fechaIni,fechaFin], (err, results) => {

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

exports.getInfoVentaMensual = async (idEmpresa, fechaIni,fechaFin) => {
    return new Promise((resolve, reject) => {
        
        try{
            let querySelectVentaMensual = `SELECT SUM(venta_total) AS 'total' FROM ventas WHERE venta_empresa_id=? AND
                                            venta_fecha_hora BETWEEN ? AND ? AND
                                            venta_anulado=0`
            
            pool.query(querySelectVentaMensual, [idEmpresa, fechaIni,fechaFin], (err, results) => {
                console.log(results);
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

exports.getInfoClientesRegistrados = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let queryInfoClientesRegistrados = `SELECT COUNT(*) AS 'total' FROM clientes WHERE cli_empresa_id=?`
            
            pool.query(queryInfoClientesRegistrados, [idEmpresa], (err, results) => {

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

exports.getInfoProdctosRegistrados = async (idEmpresa) => {
    return new Promise((resolve, reject) => {
        
        try{
            let queryInfoProductosRegistrados = `SELECT COUNT(*) AS 'total' FROM productos WHERE prod_empresa_id=? AND
                                                    prod_activo_si_no=1`
            
            pool.query(queryInfoProductosRegistrados, [idEmpresa], (err, results) => {

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

exports.getDocEmitidosAndLicenceDays = async(rucEmpresa) => {

    return new Promise((resolve, reject) => {
        
        try{
            let queryNumDocAndLicenceDays = `SELECT empresa_web_plan_enviados as emitidos,empresa_fecha_fin_facturacion as finfactura FROM
                            efactura_web.empresas,efactura_factura.empresas WHERE efactura_web.empresas.EMP_RUC
                            = efactura_factura.empresas.EMPRESA_RUC AND
                            efactura_web.empresas.EMP_RUC= ?`;
            
            pool.query(queryNumDocAndLicenceDays, [rucEmpresa], (err, results) => {

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

exports.getProductosDelMesByIdEmp = async(idEmp,fechaIni,fechaFin) => {

    return new Promise((resolve, reject) => {
        
        try{
            let queryProductosDelMes = `SELECT COUNT(*) AS cantidad,ventad_producto, SUM(venta_total) AS total FROM
                                        ventas,ventas_detalles WHERE venta_id=ventad_venta_id AND venta_empresa_id=? AND
                                        venta_fecha_hora BETWEEN ? AND ? AND
                                        venta_anulado=0 GROUP BY ventad_prod_id ORDER BY SUM(venta_total) LIMIT 10`;
            
                                        console.log(fechaIni);
                                        console.log(fechaFin);
            pool.query(queryProductosDelMes, [idEmp,fechaIni,fechaFin], (err, results) => {

                if(err){
                    reject({
                        isSucess: false,
                        code: 400,
                        messageError: err
                    });
                    return;
                }
                console.log(results);
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

exports.getClientesDelMesByIdEmp = async(idEmp,fechaIni,fechaFin) => {

    return new Promise((resolve, reject) => {
        
        try{
            let queryClientesDelMes = `SELECT COUNT(*) AS cantidad,cli_nombres_natural,SUM(venta_total) AS total
                                    FROM ventas,clientes WHERE cli_id=venta_cliente_id AND venta_empresa_id=? AND
                                    venta_fecha_hora BETWEEN ? AND ? AND
                                    venta_anulado=0 GROUP BY venta_cliente_id ORDER BY SUM(venta_total) LIMIT 10`;
            
            pool.query(queryClientesDelMes, [idEmp,fechaIni,fechaFin], (err, results) => {

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
