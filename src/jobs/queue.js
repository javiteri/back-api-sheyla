const Queue = require('bull');
const {docElectronicoworker} = require('./workers');

const docElectronicoQueue = new Queue('docelectronicos');

docElectronicoQueue.process(2, async (job, done) => {
    try{
        docElectronicoworker(job, done) 
    }catch(e){
        console.log(e);
        done(null);
    }
}
);

module.exports = {docElectronicoQueue};