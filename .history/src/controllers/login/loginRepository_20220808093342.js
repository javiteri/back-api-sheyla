const poolMysql = require('../../connectiondb/mysqlconnection');


const loginUser = function(user, password){
    return new Promise((resolve, reject) => {
        try{
            console.log(`user ${user}`);
            console.log(`pass ${password}`);
            
            let query = 'SELECT * FROM usuarios WHERE usu_nombre_usuario = ? AND usu_password = ? LIMIT 1';
            
            poolMysql.query(query, [user, password]).then(results => {
                
                console.log('inside promise');

                if(!results | results == undefined | results == null){
                    reject('no existe usuario');
                }
            

                let userMysqlData; 

                Object.keys(results).forEach(function(key){
                    var row = results[key]
                    userMysqlData = {
                        'cedula': row.USU_CEDULA,
                        'nombre': row.USU_NOMBRE_USUARIO    
                    }
                });
                
                resolve(userMysqlData)    


            }).catch(err => {
                reject(err);
            })
            
    
        }catch(error){
            console.log('catch error');
            reject(`error query user login ${error}`)
        }
    })
}


exports.login = loginUser