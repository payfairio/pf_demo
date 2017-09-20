const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    return res.send('Page under construction');
});

module.exports = router;
