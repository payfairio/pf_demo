const express = require('express');
const router = express.Router();


const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);

const cryptos = require('../config/crypto');

router.get('/', (req, res) => {
    let result = [];
    for (coin in cryptos) {
        if (cryptos.hasOwnProperty(coin) && cryptos[coin].hasOwnProperty('active') && cryptos[coin].active) {
            result.push(cryptos[coin].name);
        }
    }
    return res.json(result);
});

module.exports = router;