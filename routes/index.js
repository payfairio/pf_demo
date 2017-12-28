const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../config/crypto');
/* GET home page. */

module.exports = function (web3) {
    router.get('/', function(req, res, next) {
        return res.sendFile(path.join(__dirname, '../views', 'index.html'));
    });

    return router;
};
