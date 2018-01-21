const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../config/crypto');
/* GET home page. */

module.exports = web3 => {
    router.get('/', (req, res) => {
        return res.sendFile(path.join(__dirname, '../views', 'index.html'));
    });

    return router;
};
