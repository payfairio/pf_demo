const express = require('express');
const router = express.Router();
const api = require('../api.js');

var User = require('../db/models/User.js');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var jwt = require('jsonwebtoken');

var validator = require('express-validator');

router.use(validator({
    customValidators: {
        isUsernameAvailable: function (username) {
            return new Promise(function (resolve, reject) {
                    User.findOne({username: username})
                        .then(function (doc) {
                            if (!doc) {
                                resolve();
                            } else {
                                reject();
                            }
                        }, function (err) {
                            resolve();
                        });
            });
        },
        isEmailAvailable: function (email) {
            return new Promise(function (resolve, reject) {
                User.findOne({email: email})
                    .then(function (doc) {
                        if (!doc) {
                            resolve();
                        } else {
                            reject();
                        }
                    }, function (err) {
                        resolve();
                    });
            });
        }
    }
}));

router.post('/login', function(req, res, next) {
    req.checkBody({
        email: {
            notEmpty: {
                errorMessage: 'Email is required'
            },
            isEmail: {
                errorMessage: 'Invalid email'
            }
        },
        password: {
            notEmpty: {
                errorMessage: 'Password is required'
            }
        }
    });
    req.getValidationResult().then(function (result) {
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        User.findOne({
            email: req.body.email
        }, function (err, user) {
            if (err) throw err;

            if (!user) {
                res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
            } else {
                // check if password matches
                if (user.comparePassword(req.body.password)) {
                    // if user is found and password is right create a token
                    let payload = {
                        id: user._id,
                        username: user.username,
                        email: user.email
                    };
                    let token = jwt.sign(payload, config.secret, {
                        expiresIn: 60 * 60 * 24 * 3 // expires in 3 days
                    });
                    return res.json({success: true, token: 'JWT ' + token});
                } else {
                    return res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
                }
            }
        });
    });
});

router.post('/register', function(req, res, next) {
    req.checkBody({
        username: {
            notEmpty: {
                errorMessage: 'Username is required'
            },
            isUsernameAvailable: {
                errorMessage: 'This username is already taken'
            }
        },
        email: {
            notEmpty: {
                errorMessage: 'Email is required'
            },
            isEmail: {
                errorMessage: 'Invalid email'
            },
            isEmailAvailable: {
                errorMessage: 'This email is already taken'
            }
        },
        password: {
            notEmpty: {
                errorMessage: 'Password is required'
            },
            isLength: {
                options: {
                    min: 6
                },
                errorMessage: 'Passwords must be at least 6 chars long'
            }
        },
        type : {
            notEmpty: {
                errorMessage: 'Account type is required'
            },
            isIn: {
                options: [['client', 'escrow', 'trust']],
                errorMessage: 'Unknown account type'
            }
        }
    });
    req.getValidationResult().then(function (result) {
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        // todo: убрать из апи создание юзера, перенести все действия с юзерами сюда
        api.createUser(req.body)
            .then(function (user) {
                let payload = {
                    id: user._id,
                    username: user.username,
                    email: user.email
                };
                let token = jwt.sign(payload, config.secret, {
                    expiresIn: 60 * 60 * 24 * 3 // expires in 3 days
                });
                return res.json({success: true, token: 'JWT ' + token});
            })
            .catch(function (err) {
                return res.status(500).json({success: false, error: [err], msg: 'DB Error'});
            });
    });
});

router.get('/info', passport.authenticate('jwt', { session: false}), function (req, res) {
    User.findById(req.user.id)
        .then(function (doc) {
            if (doc) {
                return res.json(doc);
            }
            return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
        }).catch(function (err) {
            return res.status(500).json(err);
        });
});

module.exports = router;