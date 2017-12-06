const express = require('express');
const router = express.Router();

const Exchange = require('../db/models/Exchange.js');

const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);
const jwt = require('jsonwebtoken');



const validator = require('express-validator');

router.use(validator({
    customValidators: {

    }
}));

router.get('/', passport.authenticate('jwt', { session: false}), function (req, res, next) {
    let {offset, limit, order, sortBy} = req.query;
    order = order === 'true' ? -1 : 1;

    Exchange.find({owner: req.user._id})
        .sort({
            [sortBy]: order
        })
        .skip(+offset)
        .limit(+limit)
        .then(function (docs) {
            return res.json(docs);
        }).catch(function (err) {
        return res.json(err);
    });
});

router.get('/list', passport.authenticate('jwt', {session: false}), function (req, res, next) {
    let {offset, limit, order, sortBy} = req.query;
    order = order === 'true' ? -1 : 1;

    Exchange.find().populate('owner')
        .sort({
            [sortBy]: order
        })
        .skip(+offset)
        .limit(+limit)
        .then(function (docs) {
            return res.json(docs);
        }).catch(function (err) {
        return res.json(err);
    });
});

router.get('/edit/:id', passport.authenticate('jwt', { session: false}), function (req, res, next) {
    Exchange.findOne({eId: req.params.id})
        .then(function (doc) {
            if (!doc) {
                return res.status(404).json({error: "Exchange not found"});
            }
            if (doc.owner._id.toString() !== req.user._id) {
                return res.status(403).json({error: "Forbidden"});
            }
            return res.json(doc);
        }, function (err) {
            return res.status(500).json(err);
        });
});

router.get('/:id', passport.authenticate('jwt', { session: false}), function (req, res, next) {
    Exchange.findOne({eId: req.params.id})
        .then(function (doc) {
            if (!doc) {
                return res.status(404).json({error: "Exchange not found"});
            }
            return res.json(doc);
        }, function (err) {
            return res.status(500).json(err);
        });
});

router.post('/create', passport.authenticate('jwt', { session: false}), function(req, res, next) {
    if (req.user.type !== 'client') {
        return res.status(403).json({error: "Forbidden"});
    }
    req.checkBody({
        tradeType: {
            notEmpty: {
                errorMessage: 'Field is required'
            }
        },
        coin: {
            notEmpty: {
                errorMessage: 'Field is required'
            }
        },
        paymentType: {
            notEmpty: {
                errorMessage: 'Field is required'
            }
        },
        currency: {
            notEmpty: {
                errorMessage: 'Field is required'
            }
        },
        rate: {
            notEmpty: {
                errorMessage: 'Field is required'
            },
            matches: {
                options: /^([0-9]+[.])?[0-9]+$/i,
                errorMessage: 'Wrong rate. Use only digits and one dot'
            }
        },

    });
    req.getValidationResult().then(function (result) {
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        let ex = {
            _id: new mongoose.Types.ObjectId(),
            owner: req.user._id,
            tradeType: req.body.tradeType,
            coin: req.body.coin,
            paymentType: req.body.paymentType,
            currency: req.body.currency,
            rate: req.body.rate,
            conditions: req.body.conditions
        };
        new Exchange(ex).save()
        .then(function (result) {
            return res.json({success: true, exchange: result});
        }).catch(function (err) {
            return res.status(500).json({success: false, error: err});
        });
    });
});


module.exports = router;