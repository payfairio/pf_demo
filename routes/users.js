const express = require('express');
const router = express.Router();

const User = require('../db/models/User.js');
const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);
const jwt = require('jsonwebtoken');
const multer  = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// todo: set multer dest into memory storage for validate image width and height
const upload = multer({dest: 'public/profile-pic', fileFilter: function (req, file, cb) {
    // todo: file filtering function (file type, file size, etc.)
    console.log(file);
    cb(null, true);
}}).single('profileImg');

const validator = require('express-validator');

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}

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
                        if (!doc || doc.status === 'invited') {
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

router.get('/getinv/:invId', function (req, res) {
    User.findById(req.params.invId).select('email type').then(function (doc){
        if (!doc) {
            return res.status(401).json({success: false, msg: 'Wrong params'});
        }
        return res.json(doc);
    }).catch(function (err) {
       return res.status(500).json(err);
    });
});

router.post('/acceptinv/:invId', function (req, res) {
    req.checkBody({
        username: {
            notEmpty: {
                errorMessage: 'Username is required'
            },
            isUsernameAvailable: {
                errorMessage: 'This username is already taken'
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
        }
    });
    req.getValidationResult().then(function (result) {
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        User.findByIdAndUpdate(req.params.invId, {username: req.body.username, password: hash(req.body.password), status: 'active'})
            .then(function (user) {
                let payload = {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    type: user.type,
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
                res.status(401).send({success: false, msg: 'Authentication failed. Wrong email or password.'});
            } else {
                // check if password matches
                if (user.comparePassword(req.body.password)) {
                    // if user is found and password is right create a token
                    let payload = {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        type: user.type,
                    };
                    let token = jwt.sign(payload, config.secret, {
                        expiresIn: 60 * 60 * 24 * 3 // expires in 3 days
                    });
                    return res.json({success: true, token: 'JWT ' + token});
                } else {
                    return res.status(401).send({success: false, msg: 'Authentication failed. Wrong email or password.'});
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
        let user = {
            _id: new mongoose.Types.ObjectId(),
            username: req.body.username,
            email: req.body.email,
            password: hash(req.body.password),
            type: req.body.type
        };
        new User(user).save()
            .then(function (user) {
                // todo: при создании пользователя после инвайта, заменять его модель инвайта на реальную модель пользователя по всех сделках
                let payload = {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    type: user.type,
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

router.post('/profile', passport.authenticate('jwt', {session: false}), function (req, res) {
    User.findById(req.user._id).select("-password")
        .then(function (doc) {
            if (!doc) {
                return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
            }
            upload(req, res, function (err) {
                if (err) {
                    // An error occurred when uploading
                    return res.status(500).json(err);
                }
                let old_avatar = null;
                if (doc.profileImg) {
                    old_avatar = doc.profileImg;
                }
                doc.profileImg = req.file.filename;
                doc.save().then(function (doc) {
                    if (old_avatar) {
                        fs.unlink(path.resolve('public/profile-pic/'+old_avatar), function (err) {
                            if (err) {
                                return res.status(500).json(err);
                            }
                            return res.json(doc);
                        });
                    } else {
                        return res.json(doc);
                    }
                }).catch(function (err) {
                    return res.status(500).json(err);
                })
            });
        }).catch(function (err) {
        return res.status(500).json(err);
    });
});

router.get('/info', passport.authenticate('jwt', {session: false}), function (req, res) {
    User.findById(req.user._id).select("-password")
        .then(function (doc) {
            if (doc) {
                //let data = Object.assign({}, doc);
                if (!doc.profileImg) {
                    doc.profileImg = config.backendUrl+'/images/default-user-img.png';
                } else {
                    doc.profileImg = config.backendUrl+'/profile-pic/'+doc.profileImg;
                }
                return res.json(doc);
            }
            return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
        }).catch(function (err) {
            return res.status(500).json(err);
        });
});

module.exports = router;