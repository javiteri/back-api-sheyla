const pool = require('../../../connectiondb/mysqlconnection')
const excelJS = require("exceljs");
const fs = require('fs');


exports.getListProformasByIdEmpresa = async(idEmpresa, nombreBd) =>{
    return new Promise((resolve, reject) =>{
        try{

            const sqlQueryGetListProformas = `SELECT * FROM ${nombreBd}.proformas WHERE prof_empresa_id = ? ORDER BY prof_id DESC`;
            pool.query(sqlQueryGetListProformas, [idEmpresa], (err, results) => {

                if(err){
                    console.log(err);
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

        }catch(exception){
            reject({
                isSucess: false,
                mensaje: 'error al obtener la lista de proformas, reintente'
            });
        }
    });
}