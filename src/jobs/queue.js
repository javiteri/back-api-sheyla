const Queue = require('bull');
const {docElectronicoworker} = require('./workers');

const docElectronicoQueue = new Queue('docelectronicos');

docElectronicoQueue.process((job, done) => docElectronicoworker(job, done) );

module.exports = {docElectronicoQueue};