const express = require('express');
const router = express.Router();

const crypto = require('crypto');

const mongoose = require('mongoose');
const User = require('../db/models/User.js');
const path = require('path');
const validator = require('express-validator');

const config = require('../config/database');

const hash = text => crypto.createHash('sha1').update(text).digest('base64');

router.use(validator({
    customValidators: {
        isUsernameAvailable: username => {
            return new Promise((resolve, reject) => {
                User.findOne({username: username})
                    .then(doc => {
                        if (!doc) {
                            resolve();
                        } else {
                            reject();
                        }
                    }, err => {
                        resolve();
                    })
            });
        },
        isEmailAvailable: email => {
            return new Promise((resolve, reject) => {
                User.findOne({email: email})
                    .then(doc => {
                        if (!doc || doc.status === 'invited') {
                            resolve();
                        } else {
                            reject();
                        }
                    }, err => {
                        resolve();
                    })
            });
        },
        isAvailable: (email, type) => {
            return new Promise((resolve, reject) => {
                User
                    .findOne({
                        $and: [
                            {email: email},
                            {type: type}
                        ]
                    })
                    .then(doc => {
                        if (!doc || doc.status === 'invited') {
                            resolve();
                        } else {
                            reject();
                        }
                    }, err => {
                        resolve();
                    })
            });
        }
    }
}));

router.get('/:code', (req, res) => {
    if (!req.params.code) {
        res.send('reset code not found');
    }
    User
        .findOne({changePwdCode: req.params.code})
        .then(user => {
            if (!user) {
                throw {
                    msg: 'This session is not found'
                };
            }
            console.log('start render');
            res.sendFile(path.join(__dirname, '../views', 'reset_password.html'));
        })
        .catch(err => {
            //console.log(err);
            return res.status(404);
        });
});

router.post('/:code', (req, res) => {
    if (!req.params.code) {
        return res.status(404).json({success:false, error: {msg:'Empty reset code'}});
    }
    console.log(req.params.code);
    console.log(req.body);
    req.checkBody({
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
        }
    });

    req.getValidationResult().then(result => {
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        User
            .findOne({changePwdCode: req.params.code})
            .then(user => {
                if (!user) {
                    throw {
                        msg: 'This session is not found'
                    };
                }

                const io = req.app.io;
                //const clients = io.clients;
                //console.log('clients', clients, 'user id', user._id);
                const logoutClients = io.clients[user._id];
                //console.log('logoutClients', logoutClients);

                if (logoutClients) {
                    for (let i in logoutClients) {
                        io.to(logoutClients[i]).emit('refresh');
                    }
                }

                user.lastDateResetPassword = Date.now();
                user.password = hash(req.body.password);
                user.changePwdCode = null;

                return user.save();
            })
            .then(user => {
                return res.redirect(config.frontUrl);
            })
            .catch(err =>{
                res.status(400)} );
    });
});

module.exports = router;
