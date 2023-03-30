const Queue = require('bull');
const {docElectronicoworker} = require('./workers');
const {autorizarListWorker} = require('./workers');

//Colas para los procesos de autorizacion de facturaas y asi desacoplar los repositorios
const docElectronicosValidarQueue = new Queue('docelectronicos-validar');
const docElectronicoQueue = new Queue('docelectronicos');

docElectronicoQueue.process(async (job, done) => {
    try{
        docElectronicoworker(job, done) 
    }catch(e){
        console.log(e);
        done(null);
    }
}
);


docElectronicosValidarQueue.process(async (job, done) => {
    try{
        autorizarListWorker(job, done);
    }catch(e){
        console.log(e);
        done(null);
    }
});
docElectronicosValidarQueue.on('completed', async (job) => {
    
    if(job.returnvalue){
        console.log('send data to worker');
        await docElectronicoQueue.add(job,{
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 70,
            backoff: {
                type: 'fixed',
                delay: 15000
            }
        });
        
    }else{
        console.log('inside excel');
    }
});
docElectronicosValidarQueue.on('failed', (job, err) => {
    console.log('dentro de error');
});


module.exports = {docElectronicosValidarQueue};
//module.exports = {docElectronicoQueue};