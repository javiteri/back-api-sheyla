const Queue = require('bull');
const {docElectronicoworker} = require('./workers');
const {autorizarListWorker} = require('./workers');

//Colas para los procesos de autorizacion de facturaas y asi desacoplar los repositorios
const docElectronicosValidarQueue = new Queue('docelectronicos-validar');
const docElectronicoQueue = new Queue('docelectronicos');

docElectronicoQueue.process(async (job, done) => {
    try{
        docElectronicoworker(job, done);
    }catch(e){
        console.log('dentro de error doc Electronico Queue');
        done(e);
    }
});


docElectronicosValidarQueue.process(async (job, done) => {
    console.log('enviando a autorizarListWorker');
    try{
        autorizarListWorker(job, done);
    }catch(e){
        console.log('doc electronico validar queue');
        done(e);
    }
});

docElectronicosValidarQueue.on('completed', (job, result) => {
    
    //if(job.returnvalue){
    if(result){
        console.log('send data to worker');
        /*docElectronicoQueue.add(job,{
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 100,
            backoff: {
                type: 'fixed',
                delay: 15000
            }
        });*/
        docElectronicoQueue.add(job, job.opts);
    }else{
        console.log('inside excel');
    }
});


module.exports = {docElectronicosValidarQueue};
//module.exports = {docElectronicoQueue};