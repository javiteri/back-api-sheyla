const pool = require('../../../connectiondb/mysqlconnection');

exports.getInfoVentaDiaria = async (idEmpresa, fechaIni,fechaFin, nombreBd) => {
    return new Promise(async (resolve, reject) => {

        try{
            let querySelectVentaDiaria = `SELECT SUM(venta_total) AS 'total' FROM ${nombreBd}.ventas WHERE venta_empresa_id= ? AND
                                    venta_fecha_hora BETWEEN ? AND ? AND
                                    venta_anulado=0`
            
            let results = await pool.query(querySelectVentaDiaria, [idEmpresa, fechaIni,fechaFin]);
              
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

exports.getInfoVentaMensual = async (idEmpresa, fechaIni,fechaFin, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let querySelectVentaMensual = `SELECT SUM(venta_total) AS 'total' FROM ${nombreBd}.ventas WHERE venta_empresa_id=? AND
                                            venta_fecha_hora BETWEEN ? AND ? AND
                                            venta_anulado=0`
            
            let results = await pool.query(querySelectVentaMensual, [idEmpresa, fechaIni,fechaFin]);
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

exports.getInfoClientesRegistrados = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let queryInfoClientesRegistrados = `SELECT COUNT(*) AS 'total' FROM ${nombreBd}.clientes WHERE cli_empresa_id=?`
            
            let results = await pool.query(queryInfoClientesRegistrados, [idEmpresa]); 
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

exports.getInfoProdctosRegistrados = async (idEmpresa, nombreBd) => {
    return new Promise(async (resolve, reject) => {
        
        try{
            let queryInfoProductosRegistrados = `SELECT COUNT(*) AS 'total' FROM ${nombreBd}.productos WHERE prod_empresa_id=? AND
                                                    prod_activo_si_no=1`
            let results = await pool.query(queryInfoProductosRegistrados, [idEmpresa]);
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

exports.getDocEmitidosAndLicenceDays = async(rucEmpresa, nombreBd) => {

    return new Promise(async (resolve, reject) => {
        
        try{
            let queryNumDocAndLicenceDays = `SELECT empresa_web_plan_enviados as emitidos,empresa_fecha_fin_facturacion as finfactura FROM
                            ${nombreBd}.empresas,efactura_factura.empresas WHERE ${nombreBd}.empresas.EMP_RUC
                            = efactura_factura.empresas.EMPRESA_RUC AND
                            ${nombreBd}.empresas.EMP_RUC= ?`;
            
            let results = await pool.query(queryNumDocAndLicenceDays, [rucEmpresa]);
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

exports.getProductosDelMesByIdEmp = async(idEmp,fechaIni,fechaFin,nombreBd) => {

    return new Promise(async (resolve, reject) => {
        
        try{
            let queryProductosDelMes = `SELECT COUNT(*) AS cantidad,ventad_producto, SUM(venta_total) AS total FROM
                                        ${nombreBd}.ventas,${nombreBd}.ventas_detalles WHERE venta_id=ventad_venta_id AND venta_empresa_id=? AND
                                        venta_fecha_hora BETWEEN ? AND ? AND
                                        venta_anulado=0 GROUP BY ventad_prod_id ORDER BY SUM(venta_total) LIMIT 10`;
            
            let results = await pool.query(queryProductosDelMes, [idEmp,fechaIni,fechaFin]);
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

exports.getClientesDelMesByIdEmp = async(idEmp,fechaIni,fechaFin,nombreBd) => {

    return new Promise(async (resolve, reject) => {
        
        try{
            let queryClientesDelMes = `SELECT COUNT(*) AS cantidad,cli_nombres_natural,SUM(venta_total) AS total
                                    FROM ${nombreBd}.ventas,${nombreBd}.clientes WHERE cli_id=venta_cliente_id AND venta_empresa_id=? AND
                                    venta_fecha_hora BETWEEN ? AND ? AND
                                    venta_anulado=0 GROUP BY venta_cliente_id ORDER BY SUM(venta_total) LIMIT 10`;
            
            let results = await pool.query(queryClientesDelMes, [idEmp,fechaIni,fechaFin]); 
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

exports.getVentasDiaFormaPagoByIdEmp = async(idEmp,fechaIni,fechaFin,nombreBd) => {

    return new Promise(async (resolve, reject) => {
        
        try{
            let queryVentasDelDiaFormaPago = `SELECT COUNT(*) AS cantidad,venta_forma_pago,SUM(venta_total) AS total
                                FROM ${nombreBd}.ventas WHERE venta_empresa_id= ? AND 
                                venta_fecha_hora BETWEEN ? AND ? AND venta_anulado=0 GROUP BY venta_forma_pago`;
            
            let results = await pool.query(queryVentasDelDiaFormaPago, [idEmp,fechaIni,fechaFin]);
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
