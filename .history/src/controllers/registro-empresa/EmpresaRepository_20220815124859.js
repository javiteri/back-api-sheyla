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

exports.updateDatosEmpresa = function (datosEmpresa){

    return new Promise((resolve, reject) => {
        try{

            const {idEmpresa, ruc, nombreEmpresa, razonSocial, fechaInicio, eslogan, 
                web, email, telefonos, direccionMatriz, sucursal1, sucursal2, 
                sucursal3, comentario  } = datosEmpresa;

            queryInsertDatosEmpresa = ```UPDATE empresas SET EMP_NOMBRE = ?, EMP_RAZON_SOCIAL = ?, EMP_FECHA_INICIO = ?, EMP_SLOGAN = ?, 
                                            EMP_WEB = ?, EMP_MAIL = ?, EMP_TELEFONOS = ?, EMP_DIRECCION_MATRIZ = ?, EMP_DIRECCION_SUCURSAL1 = ?,
                                            EMP_DIRECCION_SUCURSAL2 = ?, EMP_DIRECCION_SUCURSAL3 = ?, EMP_PROPIETARIO = ?,
                                            EMP_COMENTARIOS = ? WHERE EMP_ID = ?  ```;

            poolMysql.query(queryInsertDatosEmpresa, [
                                nombreEmpresa, razonSocial, fechaInicio, 
                                eslogan, web, email, telefonos, direccionMatriz, sucursal1, sucursal2,
                                sucursal3, comentario, idEmpresa
                            ], function(err, results, fields) {
                                
                                console.log('before destructuring');
                                
                                if(err){
                                    reject('error actualizando datos empresa: ' + err);
                                    return;
                                }

                                const affectedRows = results.affectedRows;
                                let updateDatosEmpresaResponse = {}
                                if(affectedRows === 0){
                                    updateDatosEmpresaResponse['isSucess'] = false;
                                    updateDatosEmpresaResponse['message'] = 'error al actualizar datos empresa';
                                }else{
                                    updateDatosEmpresaResponse['isSucess'] = true;
                                }

                                resolve(datosEmpresaResponse);

                            });

        }catch(error){
            reject('error actualizando datos empresa: ' + error) ; 
        }
    });
}