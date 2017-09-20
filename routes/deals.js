const express = require('express');
const router = express.Router();
const api = require('../api.js');

const User = require('../db/models/User.js');
const Deal = require('../db/models/Deal.js');

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
    Deal.find({$or: [{'buyer': req.user.id}, {'seller': req.user.id}]}).populate('seller').populate('buyer').sort('-created_at')
        .then(function (docs) {
            return res.json(docs);
        }).catch(function (err) {
        return res.json(err);
    });
});

router.get('/deal/:id', passport.authenticate('jwt', { session: false}), function (req, res, next) {
    api.getDeal(req.params.id)
        .then(function (doc) {
            if (!doc) {
                return res.status(404).json({error: "Deal not found"});
            }
            if (doc.seller._id.toString() !== req.user.id && doc.buyer._id.toString() !== req.user.id) {
                return res.status(403).json({error: "Forbidden"});
            }
            return res.json(doc);
        }, function (err) {
            return res.status(500).json(err);
        });
});

router.post('/create', passport.authenticate('jwt', { session: false}), function(req, res, next) {
    req.checkBody({
        role: {
            notEmpty: {
                errorMessage: 'Role is required'
            }
        },
        name: {
            notEmpty: {
                errorMessage: 'Deal name is required'
            }
        },
        counterparty: {
            notEmpty: {
                errorMessage: 'Counterparty is required'
            },
            isEmail: {
                errorMessage: 'Counterparty email is invalid'
            }
        }
    });
    req.getValidationResult().then(function (result) {
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        var data = {};
        var otherUser = null;
        api.getUserByEmail(req.body.counterparty).then(function (doc) {
            if (!doc) {
                // TODO: юзера нет у нас в системе, надо выслать емайл с инвайтом.
                return res.status(404);
            }
            otherUser = doc._id;
            if(req.body.role === 'seller') {
                data.seller = req.session.user.id;
                data.buyer = otherUser;
            } else {
                data.seller = otherUser;
                data.buyer = req.session.user.id;
            }
            data.name = req.body.name;
            api.createDeal(data)
                .then(function (result) {
                     return res.json({success: true, deal: result});
                })
                .catch(function (err) {
                    return res.status(500).json({success: false, error: err});
                });
        }, function (err) {
            return res.status(500).json({success: false, error: err});
        });
    });
});


module.exports = router;