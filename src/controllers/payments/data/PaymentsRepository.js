const httpClient = require('https');
const querystring = require('querystring');

exports.ghetCheckoutId = function(amount) {
    return new Promise((resolve, reject) => {
        try{
            console.log(amount);
            const path='/v1/checkouts';
            const data = querystring.stringify({
                'entityId':'8a829418533cf31d01533d06f2ee06fa',
                'amount': amount,
                'currency':'USD',
                'paymentType':'DB'
            });
            const options = {
                port: 443,
                host: 'eu-test.oppwa.com',
                path: path,
                method: 'POST',
                headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length,
                'Authorization':'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA=='
                }
            };
            
            const callback1 = function(response){
                const buf = [];

                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    buf.push(Buffer.from(chunk));
                });

                response.on('end', async function () {
                    const jsonString = Buffer.concat(buf).toString('utf8');
                    try {
                        resolve(JSON.parse(jsonString));
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            const request = httpClient.request(options, callback1);
            request.on('error', reject)
            request.write(data);
            request.end();
            
        }catch(error){
            reject(error);
        }
    });
}

exports.getTransactionStatus = function(id, resourcePath) {
    return new Promise((resolve, reject) => {
        try{
            var path=`/v1/checkouts/${id}/payment`;
            path += '?entityId=8a829418533cf31d01533d06f2ee06fa';
            const options = {
                port: 443,
                host: 'eu-test.oppwa.com',
                path: path,
                method: 'GET',
                headers: {
                    'Authorization':'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA=='
                }
            };
            
            const callback1 = function(response){
                const buf = [];

                //another chunk of data has been received, so append it to `str`
                response.on('data', function (chunk) {
                    buf.push(Buffer.from(chunk));
                });

                response.on('end', async function () {
                    const jsonString = Buffer.concat(buf).toString('utf8');
                    try {
                        resolve(JSON.parse(jsonString));
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            const request = httpClient.request(options, callback1);
            console.log('' + request.host + request.path);
            request.on('error', reject)
            request.end();
            
        }catch(error){
            reject(error);
        }
    });
}