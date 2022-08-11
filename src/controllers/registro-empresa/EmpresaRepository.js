const poolMysql = require('../../connectiondb/mysqlconnection');

exports.getEmpresaByRuc = function (rucEmpresa, idEmpresa){
    return new Promise((resolve, reject) => {

        try {
            
            queryDatosEmpresa = 'SELECT * FROM empresas WHERE emp_ruc = ? AND emp_id = ? LIMIT 1';

            poolMysql.query(queryDatosEmpresa, [rucEmpresa, idEmpresa], function (err, results, fields) {

                if(err){
                    reject('error obteniendo datos empresa: ' + err);
                    return;
                }

                if(!results | results == undefined | results == null | !results.length){
                    reject('no existe datos empresa');
                    return;
                }

                let arrayData = new Array();
                let datosEmpresaResponse = {
                    isSucess: true
                }
                
                Object.keys(results).forEach(function(key){
                    var row = results[key]
                    arrayData.push({
                        id: row.EMP_ID,
                        ruc: row.EMP_RUC,
                        nombreEmp: row.EMP_NOMBRE,
                        razonSocial: row.EMP_RAZON_SOCIAL,
                        fechaInicio: row.EMP_FECHA_INICIO,
                        slogan: row.EMP_SLOGAN,
                        web: row.EMP_WEB,
                        email: row.EMP_MAIL,
                        telefono: row.EMP_TELEFONOS,
                        direccionMatriz: row.EMP_DIRECCION_MATRIZ,
                        direccionSucursal1: row.EMP_DIRECCION_SUCURSAL1,
                        direccionSucursal2: row.EMP_DIRECCION_SUCURSAL2,
                        direccionSucursal3: row.EMP_DIRECCION_SUCURSAL3,
                        propietario: row.EMP_PROPIETARIO,
                        comentarios: row.EMP_COMENTARIOS
                    })
                });

                datosEmpresaResponse['data'] = arrayData;

                resolve(datosEmpresaResponse);
            });


        }catch(err){
            reject('error obteniendo datos empresa: ' + err) ;
        }

    })
}