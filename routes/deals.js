const express = require('express');
const router = express.Router();
const api = require('../api.js');

const User = require('../db/models/User.js');
const Deal = require('../db/models/Deal.js');
const Invite = require('../db/models/Invite.js');

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
    Deal.find({$or: [{'buyer': req.user._id}, {'seller': req.user._id}]}).populate('seller').populate('buyer').sort('-created_at')
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
            if (doc.seller._id.toString() !== req.user._id && doc.buyer._id.toString() !== req.user._id) {
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
        User.findOne({email: req.body.counterparty}).then(function (doc) {
            return new Promise(function (resolve, reject) {
                if (!doc) { // create user with status 'invited'
                    new User({email: req.body.counterparty, status: 'invited'}).save(function (err, user) {
                        if (err) {
                            reject(err);
                        }
                        resolve(user);
                    });
                } else { // there is active or already invited user
                    resolve(doc);
                }
            });
        }).then(function (user) {
            return new Promise(function (resolve, reject) {
                if (user.status === 'invited') {
                    user.sendMailInviteNotification().then(function (data) {
                        resolve(user);
                    }, function (err) {
                        reject(err);
                    });
                } else {
                    resolve(user);
                }
            });
        })
/*

            if (!doc) {
                // TODO: юзера нет у нас в системе, надо выслать емайл с инвайтом.
                Invite.findOne({email: req.body.counterparty}).then(function (invDoc) {
                    return new Promise(function (resolve, reject) {
                       if (invDoc) {
                           resolve(invDoc);
                       } else {
                           new Invite({email: req.body.counterparty}).save(function (err, invDoc) {
                               if (err) {
                                   reject(err);
                               }
                               resolve(invDoc);
                           });
                       }
                    });
                }).then(function (invDoc) {
                    otherUser = invDoc._id;
                    if (req.body.role === 'seller') {
                        data.seller = req.user._id;
                        data.buyer = otherUser;
                    } else {
                        data.seller = otherUser;
                        data.buyer = req.user._id;
                    }
                    return api.createDeal({});
                    return invDoc.sendMailNotification();
                }).then(function (data) {
                    return res.json(data);
                }).catch(function (err) {
                    console.log(err);
                    return res.status(500).json({success: false, error: err});
                });
            } else {*/
            .then(function (doc) {
                otherUser = doc._id;
                if (req.body.role === 'seller') {
                    data.seller = req.user._id;
                    data.buyer = otherUser;
                } else {
                    data.seller = otherUser;
                    data.buyer = req.user._id;
                }
                data.name = req.body.name;
                api.createDeal(data)
                    .then(function (result) {
                        return res.json({success: true, deal: result});
                    })
                    .catch(function (err) {
                        return res.status(500).json({success: false, error: err});
                    });
        }).catch(function (err) {
            return res.status(500).json({success: false, error: err});
        });
    });
});


module.exports = router;