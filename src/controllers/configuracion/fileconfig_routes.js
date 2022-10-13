var express = require('express');
var router = express.Router();
const configRepository = require('./data/ConfigRepository');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' }).single('file');
const ftp = require('basic-ftp');

router.post('/insertfilefirmaelec',async (req, res) => {

    upload(req, res, async (error) => {
        if(error){
            console.log(error);
            console.log('ocurrio un error en multer');
        }

        if(req.file){
            const now = new Date();
            const dateString = '' + now.getFullYear() + '' + ('0' + (now.getMonth()+1)).slice(-2) + 
                            '' + ('0' + now.getDate()).slice(-2) ;

            let ruc = req.body.ruc;
            let claveFirma = req.body.claveFirma;

            let path = './uploads';
            const response = await sendFileFirmaToFtp(`${path}/${req.file.filename}`, `${ruc}${dateString}.p12`);
            
            if(response && response.code == 226){
                // TODO OK SE DEBE GUARDAR LA RUTA DE LA FIRMA FTP EN LA BASE DE DATOS CON NOMBRE DE ARCHIVO Y TODO   

                let defaultPath = 'D:\\xampp\\htdocs\\firmas_electronicas\\';

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

    
        // SEND FILE TO FTP
        // DELETE FILE FROM UPLOADS DIR
        


        //res.send(req.file);
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
        const response = await client.uploadFrom(pathFileFirmaUpload,`logos/${nombreFirmaFile}` );
        
        return response;
    }catch(exception){
        client.close()
    }

}

module.exports = router;