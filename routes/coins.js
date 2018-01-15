const express = require('express');
const router = express.Router();


const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);

const jwt = require('jsonwebtoken');

const cryptos = require('../config/crypto');


const validator = require('express-validator');

router.use(validator({
    customValidators: {

    }
}));

router.get('/', function (req, res, next) {
    let result = [];
    for (coin in cryptos) {
        if (cryptos.hasOwnProperty(coin) && cryptos[coin].hasOwnProperty('active') && cryptos[coin].active) {
            result.push(cryptos[coin].name);
        }
    }
    return res.json(result);
});

module.exports = router;