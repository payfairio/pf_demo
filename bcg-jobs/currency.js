const mongoose = require('mongoose');
const Currency = require('../db/models/Currency.js');
const currencyName = require('../config/currency');

const settings = require('../config/settings')('bcg-escrows');

const request = require('request-promise-native');


module.exports = function(){
    setInterval(function(){
        Currency.find({}).then(function(results) {
            var options = {
                uri: 'http://api.fixer.io/latest?base=USD',
                json: true
            };
            request(options)
                .then(function (response) {
                    for (var i = 0; i < Object.keys(currencyName).length; i++) {
                        Currency.deleteMany( {}, function(err, results) {
                            //console.log(results);
                        });
                        new Currency({
                            name: Object.values(currencyName)[i].name,
                            value: response.rates[Object.values(currencyName)[i].name],
                            date: new Date(Date.now()).toISOString()                    
                        }).save();
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

        }).catch(function (err){
            console.log(err);
        });
    }, 1000 * settings.time_to_check_currency );
};