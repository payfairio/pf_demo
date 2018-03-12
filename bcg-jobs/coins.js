const mongoose = require('mongoose');
const Price = require('../db/models/Price.js');
//const cryptos = require('../config/crypto');

const Crypto = require('../db/models/crypto/Crypto');

const settings = require('../config/settings')('bcg-escrows');

const request = require('request-promise-native');


module.exports = function(){

    setInterval(function(){
        Crypto.find({active: true}).then(cryptos => {
            let promises = [];
            Price.find({}).then(function(results) {
                for (let coin in cryptos){
                    var coinname = cryptos[coin].fullname;
                    var options = {
                        uri: 'https://api.coinmarketcap.com/v1/ticker/'+coinname+'/',
                        json: true
                    };
                    promises.push(request(options));
                }
                Promise.all(promises).then(function(responses) {
                    for (var i = 0; i < Object.keys(cryptos).length; i++){
                        Price.deleteMany( {}, function(err, results) {
                            //console.log('result coins usd: ',results);
                        } );
                        new Price({
                            _id: new mongoose.Types.ObjectId(),
                            name: cryptos[i].name,
                            value: responses[i][0].price_usd,
                            date: new Date(Date.now()).toISOString()
                        }).save();
                    }
                }).catch(function (err){
                    console.log(err);
                });
            }).catch(function (err){
                console.log(err);
            });
        }).catch(function (err){
            console.log(err);
        });
    }, 1000 * settings.time_to_check_currency);

};