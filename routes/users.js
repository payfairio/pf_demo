const express = require('express');
const router = express.Router();

const User = require('../db/models/User.js');
const Account = require('../db/models/crypto/Account.js');

const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);
const jwt = require('jsonwebtoken');
const multer  = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config_crypto = require('../config/crypto');

const Review = require('../db/models/Review.js');
const Deal = require('../db/models/Deal.js');

// todo: set multer dest into memory storage for validate image width and height
const upload = multer({dest: 'public/profile-pic', fileFilter: function (req, file, cb) {
    // todo: file filtering function (file type, file size, etc.)
    cb(null, true);
}}).single('profileImg');

const validator = require('express-validator');

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}

function createAccount (data) {
    return new Account(data).save();
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
module.exports = function (web3) {
    router.get('/getinv/:invId', function (req, res) {
        User.findById(req.params.invId).select('email type').then(function (doc) {
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
            User.findByIdAndUpdate(req.params.invId, {
                username: req.body.username,
                password: hash(req.body.password),
                status: 'active'
            })
                .then(function (user) {
                    return user.sendMailVerification();
                })
                .then(async function (user) {
                    // generate wallet (eth and erc20 only now)
                    let newAccount = web3.eth.accounts.create();
                    let account = await createAccount({
                        address: newAccount.address,
                        privateKey: newAccount.privateKey,
                        coin: 'eth',
                        owner: user._id
                    });
                    user.wallet = account._id;
                    await user.save();
                    // generate jwt
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

    router.post('/login', function (req, res, next) {
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
                        return res.status(401).send({
                            success: false,
                            msg: 'Authentication failed. Wrong email or password.'
                        });
                    }
                }
            });
        });
    });

    router.post('/register', function (req, res, next) {
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
            type: {
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
                    return user.sendMailVerification();
                })
                .then(async function (user) {
                    // generate wallet (eth and erc20 only now)
                    let newAccount = web3.eth.accounts.create();
                    let account = await createAccount({
                        address: newAccount.address,
                        privateKey: newAccount.privateKey,
                        coin: 'eth',
                        owner: user._id
                    });
                    user.wallet = account._id;
                    await user.save();
                    // generate jwt token
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
                            fs.unlink(path.resolve('public/profile-pic/' + old_avatar), function (err) {
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
        User.findById(req.user._id).select("-password").populate('wallet')
            .then(async function (doc) {
                if (doc) {
                    let user = {
                        _id: doc._id,
                        username: doc.username,
                        email: doc.email,
                        type: doc.type,
                        holds: doc.holds,
                        status: doc.status,
                        profileImg: doc.profileImg
                    };
                    //let data = Object.assign({}, doc);
                    if (!user.profileImg) {
                        user.profileImg = config.backendUrl + '/images/default-user-img.png';
                    } else {
                        user.profileImg = config.backendUrl + '/profile-pic/' + doc.profileImg;
                    }
                    user.balances = {};
                    // pfr balance
                    const contract = new web3.eth.Contract(require('../abi/Token.json'), config_crypto.pfr_address);
                    user.balances.pfr = await contract.methods.balanceOf(doc.wallet.address).call();
                    user.balances.pfr = user.balances.pfr / Math.pow(10, 8);
                    // eth balance
                    user.balances.eth = web3.utils.fromWei(await web3.eth.getBalance(doc.wallet.address));
                    user.address = doc.wallet.address;
                    return res.json(user);
                }
                return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
            }).catch(function (err) {
            return res.status(500).json(err);
        });

    });
    router.post('/user/:id/addReview', passport.authenticate('jwt', {session: false}), function(req, res){
        req.checkBody({
            comment: {
                notEmpty: {
                    errorMessage: 'Comment is required'
                }
            }
        });
        req.getValidationResult().then(function (result) {
            if (result.array().length > 0) {
                return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
            }

            Review.findOne({
                $and: [
                    {author: req.user._id},
                    {deal: req.body.deal_id}
                ]
            }).then(function(doc){
                if (doc){
                    throw {msg: 'You can leave only one review for one deal'};
                }

                return Deal.find(
                    {$and: [
                        {
                            $or: [{
                                'buyer': req.user._id
                            }, {
                                'seller': req.user._id
                            }]
                        },
                        {_id: req.body.deal_id}
                    ]});
            }).then(function (deal){
                let review = {
                    _id: new mongoose.Types.ObjectId(),
                    user: req.params.id,
                    author: req.user._id,
                    comment: req.body.comment,
                    rating: req.body.rating,
                    deal: req.body.deal_id
                };
                return new Review(review).save();
            }).then(function (data){
                return res.json({success: true, msg: 'Thanks for review!'});
            }).catch(function (err){
                console.log('Add Review method error: ', err);
                return res.status(500).json({success: false, error: [err], msg: err.msg ? err.msg : 'DB Error'});
            });
        });
    });

    router.get('/user/:id', passport.authenticate('jwt', {session: false}), function(req, res){
        User.findOne({
            _id: req.params.id
        }).select('-password').then(function(user){
            return new Promise(function (resolve, reject){
                if (!user.profileImg) {
                    user.profileImg = config.backendUrl + '/images/default-user-img.png';
                } else {
                    user.profileImg = config.backendUrl + '/profile-pic/' + doc.profileImg;
                }
                Review.find({user: user._id}).populate('author', ['-password', '-wallet']).then(function(reviews){
                    resolve({user: user, reviews: reviews});
                }).catch(function(err){
                    reject(err);
                });
            });
        }).then(function(data){
            return res.json(data);
        }).catch(function(err){
            console.log(err);
        });
    });

    router.get('/user/:id/review', passport.authenticate('jwt', {session: false}), function(req, res) {
        Review.find({
            user: req.params.id
        }).populate('author', '-password').then(function(review){
            return res.json(review);
        }).catch(function(err){
            console.log(err);
        });
    });

    router.get('/verify/:code', function (req, res) {
        if (!req.params.code) {
            return res.status(404).json({success:false, error: {msg:'Empty verify code'}});
        }
        User
            .findOne({verifyCode: req.params.code})
            .then(function (user) {
                if (!user) {
                    throw {
                        msg: 'This session is not found'
                    };
                }
                
                user.verifyCode = null;
                user.status = 'active';
                return user.save();
            })
            .then(function (user) {
                return res.json({success: true});
            })
            .catch(function (err) {
                return res.status(400).json({success: false, error: err});
            });
    });

    router.post('/reset', function (req, res) {
        req.checkBody({
            email: {
                notEmpty: {
                    errorMessage: 'Email is required'
                },
                isEmail: {
                    errorMessage: 'Invalid email'
                }
            }
        });
        
        req.getValidationResult().then(function (result) {
            if (result.array().length > 0) {
                return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
            }
            User
                .findOne({email: req.body.email})
                .then(function (user) {
                    if (!user) {
                        throw {msg: 'User not found'}
                    }

                    return user.sendMailReset();
                })
                .then(function (user) {
                    return res.json({success: true});
                })
                .catch(function (err) {
                    return res.status(401).json({success: false, error: err});
                });
        });
    });

    router.get('/reset/:code', function (req, res) {
        if (!req.params.code) {
            return res.status(404).json({success:false, error: {msg:'Empty reset code'}});
        }
        User
            .findOne({changePwdCode: req.params.code})
            .then(function (user) {
                if (!user) {
                    throw {
                        msg: 'This session is not found'
                    };
                }
                return res.json({success: true, email: user.email});
            })
            .catch(function (err) {
                return res.status(400).json({success: false, error: err});
            });
    });

    router.post('/reset/:code', function (req, res) {
        if (!req.params.code) {
            return res.status(404).json({success:false, error: {msg:'Empty reset code'}});
        }
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

        req.getValidationResult().then(function (result) {
            if (result.array().length > 0) {
                return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
            }
            User
            .findOne({changePwdCode: req.params.code})
            .then(function (user) {
                if (!user) {
                    throw {
                        msg: 'This session is not found'
                    };
                }

                user.password = hash(req.body.password);
                user.changePwdCode = null;
                return user.save();
            })
            .then(function (user) {
                return res.json({success: true});
            })
            .catch(function (err) {
                return res.status(400).json({success: false, error: err});
            });
        });
    });

    return router;
};