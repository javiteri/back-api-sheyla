const Queue = require('bull');
const {docElectronicoworker} = require('./workers');
const {autorizarListWorker} = require('./workers');

//Colas para los procesos de autorizacion de facturaas y asi desacoplar los repositorios
const docElectronicosValidarQueue = new Queue('docelectronicos-validar');
const docElectronicoQueue = new Queue('docelectronicos');

docElectronicoQueue.process(async (job, done) => docElectronicoworker(job, done) );


docElectronicosValidarQueue.process(async (job, done) => {
    autorizarListWorker(job, done);
});
docElectronicosValidarQueue.on('completed', job => {
    
    if(job.data.returnvalue){
        console.log('send data to worker');
        docElectronicoQueue.add(job,{
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 100,
            backoff: {
                type: 'fixed',
                delay: 60000
            }
        });
    }
});


module.exports = {docElectronicosValidarQueue};
//module.exports = {docElectronicoQueue};