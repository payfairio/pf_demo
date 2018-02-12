const express = require('express');
const router = express.Router();


const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);

const mongoose = require('mongoose');
const Price = require('../db/models/Price.js');
const Currency = require('../db/models/Currency.js');

const cryptos = require('../config/crypto');
const currencyName = require('../config/currency');
const request = require('request-promise-native');


router.get('/', (req, res) => {
    let result = [];
    for (coin in cryptos) {
        if (cryptos.hasOwnProperty(coin) && cryptos[coin].hasOwnProperty('active') && cryptos[coin].active) {
            result.push(cryptos[coin].name);
        }
    }
    return res.json(result);
});

router.get('/test',  (req, res) => {
    let currency = [];
    Price.find({}).then(function(results) {
    	if (results != 0) {
			for (var i = 0; i < results.length; i++){
				currency.push(results[i].name + ': ' + results[i].value);
			}
			return res.json(currency);
		}
	}).catch(function(err){
        console.log(err);
    });
    
});

router.get('/test/currency',  (req, res) => {
    let currency = [];
    Currency.find({}).then(function(results) {
    	if (results != 0) {
			for (var i = 0; i < results.length; i++){
				currency.push('1 USD = ' + results[i].value + ' ' + results[i].name);
			}
			return res.json(currency);
		}
	}).catch(function(err){
        console.log(err);
    });
    
});

router.get('/test/value/:str',  (req, res) => { 
    var firstValue;
    var twoValue; 
    var strURL = req.params.str;
    if ( strURL.indexOf('_in_') != -1) {
        var splitURL = strURL.split('_in_');
        var firstName = splitURL[0].toUpperCase();
        var twoName = splitURL[1].toUpperCase();
        if (splitURL.length == 2) {
            Price.find({ "name": firstName }).then(function(result) {
                if (result != 0) {
                    firstValue = result[0].value;
                    Price.find({ "name": twoName }).then(function(result) {
                        if (result != 0) {
                            twoValue = result[0].value;
                            return res.json(firstValue + ',' + twoValue);
                            
                        }
                        else {
                            Currency.find({ "name": twoName }).then(function(result) {
                                if (result != 0) {
                                    twoValue = result[0].value;
                                    return res.json(firstValue + ',' + twoValue);
                                }
                                else {
                                    return res.status(404).json({
                                        error: "Exchange rate not found"
                                    });
                                }
                            }).catch(function(err){
                                console.log(err);
                            });
                        }
                    }).catch(function(err){
                        console.log(err);
                    });
                }
                else {
                    Currency.find({ "name": firstName }).then(function(result) {
                        if (result != 0) {
                            firstValue = result[0].value;
                            Price.find({ "name": twoName }).then(function(result) {
                                if (result != 0) {
                                    twoValue = result[0].value;
                                    return res.json(firstValue + ',' + twoValue);
                                    
                                }
                                else {
                                    Currency.find({ "name": twoName }).then(function(result) {
                                        if (result != 0) {
                                            twoValue = result[0].value;
                                            return res.json(firstValue + ',' + twoValue);
                                        }
                                        else {
                                            return res.status(404).json({
                                                error: "Exchange rate not found"
                                            });
                                        }
                                    }).catch(function(err){
                                        console.log(err);
                                    });
                                }
                            }).catch(function(err){
                                console.log(err);
                            });
                        }
                    }).catch(function(err){
                        console.log(err);
                    });
                }

            }).catch(function(err){
                console.log(err);
            });

        }
        else {
            return res.status(404).json({
                error: "Exchange rate not found"
            });
        }
    }
    else {
        return res.status(404).json({
            error: "Exchange rate not found"
        });
    }

    
});
module.exports = router;
