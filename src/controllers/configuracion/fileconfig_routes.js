var express = require('express');
var router = express.Router();
const configRepository = require('./data/ConfigRepository');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' }).single('file');
const ftp = require('basic-ftp');
const fs = require('fs');

router.post('/insertfilefirmaelec',async (req, res) => {

    upload(req, res, async (error) => {
        if(error){
            console.log(error);
            console.log('ocurrio un error en multer');
            return;
        }

        if(req.file){
            const now = new Date();
            const dateString = '' + now.getFullYear() + '' + ('0' + (now.getMonth()+1)).slice(-2) + 
                            '' + ('0' + now.getDate()).slice(-2) ;

            let ruc = req.body.ruc;
            let claveFirma = req.body.claveFirma;

            console.log('ruc firma');
            console.log(ruc);
            console.log(dateString);
            console.log(claveFirma);
            let path = './uploads';
            const response = await sendFileFirmaToFtp(`${path}/${req.file.filename}`, `${ruc}${dateString}.p12`);
            
            if(response && response.code == 226){
                // TODO OK SE DEBE GUARDAR LA RUTA DE LA FIRMA FTP EN LA BASE DE DATOS CON NOMBRE DE ARCHIVO Y TODO   

                let defaultPath = 'D:\\xampp\\htdocs\\firmas_electronicas\\';
                
                //ELIMINAR ARCHIVO P12
                fs.unlink(`${path}/${req.file.filename}`, function(){
                    console.log("File was deleted") // Callback
                    //res.status(200).send(result);
                });

                configRepository.insertFileNameFirmaElec(claveFirma,ruc,`${defaultPath}${ruc}${dateString}.p12`).then(
                    function(result){
                        res.send(result);
                    },
                    function(error){
                        res.json('ocurrio un error actualizando datos firma');
                    }
                );
            }else{
                res.json('ocurrio un error');
                
            }

        }else{
            
            if(req.body.claveFirma){
                configRepository.insertFileNameFirmaElec(req.body.claveFirma,req.body.ruc,``).then(
                    function(result){
                        res.send(result);
                    },
                    function(error){
                        res.json('ocurrio un error actualizando datos firma');
                    }
                );
            }else{
                res.json('ok');
            }
        }
    });

});


async function sendFileFirmaToFtp(pathFileFirmaUpload, nombreFirmaFile){
    const client = new ftp.Client()

    try {
        await client.access({
            host: "sheyla2.dyndns.info",
            user: "firmas",
            password: "m10101418M"
        })
        const response = await client.uploadFrom(pathFileFirmaUpload,`/logos/${nombreFirmaFile}` );
        console.log('response clave firma');
        console.log(response);
        client.close();

        return response;
    }catch(exception){
        console.log('error subiendo firma electronica');
        client.close();
    }
}

module.exports = router;