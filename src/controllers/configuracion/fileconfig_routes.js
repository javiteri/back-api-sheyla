const express = require('express');
const router = express.Router();
const configRepository = require('./data/ConfigRepository');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' }).single('file');
const ftp = require('basic-ftp');
const fs = require('fs');

router.post('/insertfilefirmaelec',async (req, res) => {

    upload(req, res, async (error) => {
        if(error){
            return;
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
                
                //ELIMINAR ARCHIVO P12
                await deleteFile(`${path}/${req.file.filename}`);

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
            host: process.env.hostFtpFirmas,
            user: process.env.userFtpFirmas,
            password: process.env.passFtpFirmas
        })
        const response = await client.uploadFrom(pathFileFirmaUpload,`${nombreFirmaFile}` );
        client.close();

        return response;
    }catch(exception){
        console.log('error subiendo firma electronica');
        client.close();
    }
}


const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            resolve('todo ok');
        });
    });
};


module.exports = router;