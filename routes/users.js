const express = require('express');
const router = express.Router();

const User = require('../db/models/User.js');
const Account = require('../db/models/crypto/Account.js');
const CWallet = require('../db/models/ConfirmingWallet');
const CommissionWallet = require('../db/models/crypto/commissionWallet');
const Review = require('../db/models/Review.js');
const Deal = require('../db/models/Deal.js');
const Notification = require('../db/models/Notification.js');
const CryptoDB = require('../db/models/crypto/Crypto');
const HistoryTransaction = require('../db/models/HistoryTransaction');
const Exchange = require('../db/models/Exchange');

const stringLodash = require('lodash/string');
const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);
const jwt = require('jsonwebtoken');
const multer  = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BigNumber = require('bignumber.js');



// todo: set multer dest into memory storage for validate image width and height
const upload = multer({dest: 'public/profile-pic', fileFilter: (req, file, cb) => {
    // todo: file filtering (file type, file size, etc.)
    cb(null, true);
}}).single('profileImg');

const validator = require('express-validator');

const hash = text => crypto.createHash('sha1').update(text).digest('base64');

const createAccount = data => new Account(data).save();
const createHistory = data => new HistoryTransaction(data).save();

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

module.exports = web3 => {

    router.get('/getinv/:invId',  (req, res) => {
        User.findById(req.params.invId).select('email type').then(doc => {
            if (!doc) {
                return res.status(401).json({success: false, msg: 'Wrong params'});
            }
            return res.json(doc);
        }).catch(err => res.status(500).json(err));
    });

    router.post('/acceptinv/:invId', (req, res) => {
        req.checkBody({
            username: {
                notEmpty: {
                    errorMessage: 'Username is required'
                },
                matches:{
                    options: /^[a-zA-Z0-9_-]{3,15}$/i,
                    errorMessage: 'Wrong username. The username must be at least 3 and not more than 15 characters. Use letters, digits, - , _ '
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
        req.getValidationResult().then(result => {
            if (result.array().length > 0) {
                return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
            }
            User.findByIdAndUpdate(req.params.invId, {
                username: req.body.username,
                password: hash(req.body.password),
                status: 'active'
            })
                .then(user => {
                    return user.sendMailVerification();
                })
                .then(async user => {
                    // generate wallet (eth and erc20 only now)

                    let db_cryptos = await CryptoDB.find({});

                    for (let i in db_cryptos) {
                        let currCoin = {
                            coin: db_cryptos[i],
                            name: db_cryptos[i].name.toLowerCase()
                        };
                        user.total.push(currCoin);
                    }

                    let newAccount = web3.eth.accounts.create();
                    let account = await createAccount({
                        address: newAccount.address,
                        privateKey: newAccount.privateKey,
                        coin: 'eth',
                        owner: user._id
                    });
                    user.wallet = account._id;

                    let historyTransactions = await createHistory({
                        owner: user._id,
                        outsidePlatform: [],
                        inPlatform: []
                    });
                    user.historyTransaction = historyTransactions._id;

                    await user.save();
                    // generate jwt
                    let payload = {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        type: user.type,
                        lastDateResetPassword: Date.now(),
                    };
                    let token = jwt.sign(payload, config.secret, {
                        expiresIn: 60 * 60 * 24 * 3 // expires in 3 days
                    });
                    return res.json({success: true, token: 'JWT ' + token});
                })
                .catch(err => res.status(500).json({success: false, error: [err], msg: 'DB Error'}));
        });
    });

    router.post('/login', async (req, res, next) => {
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
        const result = await req.getValidationResult();
        if (result.array().length > 0) {
            return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
        }
        User.findOne({
            $and: [
                {email: req.body.email},
                {type: req.body.type}
            ]
        }, (err, user) => {
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
                        lastDateResetPassword: Date.now(),
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

    router.post('/register', async (req, res) => {
        try {
            req.checkBody({
                username: {
                    notEmpty: {
                        errorMessage: 'Username is required'
                    },
                    matches:{
                        options: /^[a-zA-Z0-9_-]{3,15}$/i,
                        errorMessage: 'Wrong username. The username must be at least 3 and not more than 15 characters. Use letters, digits, - , _ '
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

            req
                .checkBody('email')
                .notEmpty().withMessage('Email is required')
                .isEmail().withMessage('Invalid email')
                .isAvailable(req.body.type).withMessage('This email is already taken');

            const result = await req.getValidationResult();
            if (result.array().length > 0) {
                return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
            }

            let db_cryptos = await CryptoDB.find({});

            let user = await new User({
                _id: new mongoose.Types.ObjectId(),
                username: req.body.username,
                email: req.body.email,
                password: hash(req.body.password),
                type: req.body.type,
                lastDateResetPassword: Date.now(),
                total: [],
            });

            for (let i in db_cryptos) {
                let currCoin = {
                    coin: db_cryptos[i],
                    name: db_cryptos[i].name.toLowerCase()
                };
                user.total.push(currCoin);
            }

            // generate wallet (eth and erc20 only now)
            let newAccount = web3.eth.accounts.create();
            let account = await createAccount({
                address: newAccount.address,
                privateKey: newAccount.privateKey,
                coin: 'eth',
                owner: user._id
            });
            user.wallet = account._id;

            //create history transactions
            let historyTransactions = await createHistory({
                owner: user._id,
                outsidePlatform: [],
                inPlatform: []
            });
            user.historyTransaction = historyTransactions._id;

            //status escrow
            if (req.body.type === 'escrow'){
                user.statusEscrowBool = false;
            }

            //generate trust Wallet
            if (user.type === 'trust'){
                user.trustWallet = [];
            }

            await user.save();

            user = await user.sendMailVerification();

            // generate jwt token
            let payload = {
                _id: user._id,
                username: user.username,
                email: user.email,
                type: user.type,
                lastDateResetPassword: Date.now(),
            };
            let token = jwt.sign(payload, config.secret, {
                expiresIn: 60 * 60 * 24 * 3 // expires in 3 days
            });
            return res.json({success: true, token: 'JWT ' + token});
        } catch (err) {
            return res.status(500).json({success: false, error: [err], msg: 'DB Error'});
        }
    });

    router.post('/profile', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            const doc = await User.findById(req.user._id).select('-password');
            if (!doc) {
                return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
            }
            upload(req, res, async (err) => {
                if (err) {
                    // An error occurred when uploading
                    return res.status(500).json(err);
                }
                let old_avatar = null;
                if (doc.profileImg) {
                    old_avatar = doc.profileImg;
                }
                doc.profileImg = req.file.filename;
                await doc.save();
                if (old_avatar) {
                    fs.unlink(path.resolve('public/profile-pic/' + old_avatar), err => {
                        if (err) {
                            return res.status(500).json(err);
                        }
                        return res.json(doc);
                    });
                } else {
                    return res.json(doc);
                }
            });
        } catch (err) {
            return res.status(500).json(err);
        }
    });

    router.get('/info', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            const doc = await User.findById(req.user._id).populate('trustWallet').populate('wallet').select("-password");
            if (!doc) {
                return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
            }

            const user = {
                _id: doc._id,
                username: doc.username,
                email: doc.email,
                type: doc.type,
                status: doc.status,
                profileImg: doc.profileImg,
                //holds: doc.holds
            };

            if (doc.type === 'escrow'){
                user.statusEscrowBool = doc.statusEscrowBool;
            }

            if (doc.type === 'trust'){
                user.trustWallet = doc.trustWallet;
            }

            if (doc.status === 'unverified') {
                user.type = 'unverified-user';
            }

            if (!user.profileImg) {
                user.profileImg = config.backendUrl + '/images/default-user-img.png';
            } else {
                user.profileImg = config.backendUrl + '/profile-pic/' + doc.profileImg;
            }

            user.balances = {};
            user.holds = {};

            // balance total
            for (let currCoin of doc.total){
                user.balances[currCoin.name] = +Number(currCoin.amount).toFixed(8);
                user.holds[currCoin.name] = +Number(currCoin.holds).toFixed(8);
            }

            user.address = doc.wallet.address;
            return res.json(user);
        } catch (err) {
            console.log('err /get/users/info', err);
            return res.status(500).json(err);
        }
    });

    router.post('/user/:id/addReview', passport.authenticate('jwt', {session: false}), (req, res) => {
        req.checkBody({
            comment: {
                notEmpty: {
                    errorMessage: 'Comment is required'
                }
            },
            rating: {
                notEmpty: {
                    errorMessage: 'Set the rating value from 1 to 5'
                },
                isIn: {
                    options: [['1', '2', '3', '4', '5']],
                    errorMessage: 'Set the rating value from 1 to 5'
                }
            }
        });
        req.getValidationResult().then(result => {
            if (result.array().length > 0) {
                return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
            }

            Review.findOne({
                $and: [
                    {author: req.user._id},
                    {deal: req.body.deal_id}
                ]
            }).then(doc => {
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
            }).then(deal => {
                let review = {
                    _id: new mongoose.Types.ObjectId(),
                    user: req.params.id,
                    author: req.user._id,
                    comment: req.body.comment,
                    rating: req.body.rating,
                    deal: req.body.deal_id
                };
                return new Review(review).save();
            }).then(data => {
                return res.json({success: true, msg: 'Thanks for review!'});
            }).catch(err => {
                console.log('Add Review method error: ', err);
                return res.status(500).json({success: false, error: [err], msg: err.msg ? err.msg : 'DB Error'});
            });
        });
    });

    router.get('/user/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
        User.findOne({
            _id: req.params.id
        }).select('-password').then(user => {
            return new Promise((resolve, reject) => {
                if (!user.profileImg) {
                    user.profileImg = config.backendUrl + '/images/default-user-img.png';
                } else {
                    user.profileImg = config.backendUrl + '/profile-pic/' + user.profileImg;
                }
                Review.find({user: user._id}).populate('author', ['-password', '-wallet']).then(reviews => {
                    resolve({user: user, reviews: reviews});
                }).catch(err => {
                    reject(err);
                });
            });
        }).then(data => {
            return res.json(data);
        }).catch(err => {
            console.log(err);
        });
    });

    router.get('/user/:id/review', passport.authenticate('jwt', {session: false}), (req, res) => {
        Review.find({
            user: req.params.id
        }).populate('author', '-password').then(review => {
            return res.json(review);
        }).catch(err => {
            console.log(err);
        });
    });

    router.get('/user/:id/getreview', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            let {offset, limit, order, sortBy, type} = req.query;
            order = order === 'true' ? -1 : 1;
            Review.count({user: req.params.id})
                .then(total => {

                    Review.find({user: req.params.id})
                        .populate('author', '-password')
                        .sort({
                            [sortBy]: order
                        })
                        .skip(+offset)
                        .limit(+limit)
                    .then(review => {
                        return res.json({total: total, data: review});
                    }).catch(err => {
                        console.log(err);
                    });
            }).catch(err => {
                console.log(err);
            });
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    router.get('/sendVerify', passport.authenticate('jwt', {session: false}), function (req, res) {
        User
            .findOne({_id: req.user._id, status: 'unverified'})
            .then(user => {
                if (!user) {
                    throw {
                        msg: 'User is already verified'
                    }
                }

                return user.sendMailVerification();
            })
            .then(user => {
                return res.json({msg: 'Please check email and verify your account.'});
            })
            .catch(err => {
                return res.status(400).json({success: false, error: err});
            })
    });

    router.get('/verify/:code', (req, res) => {
        if (!req.params.code) {
            return res.status(404).json({success:false, error: {msg:'Empty verify code'}});
        }
        User
            .findOne({verifyCode: req.params.code})
            .then(user => {
                if (!user) {
                    throw {
                        msg: 'This session is not found'
                    };
                }
                
                user.verifyCode = null;
                user.status = 'active';
                return user.save();
            })
            .then(user => res.json({success: true}))
            .catch(err => res.status(400).json({success: false, error: err}));
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
                    },
                    type: {
                        notEmpty:{
                            errorMessage: 'Type user error'
                        },
                    }
                });

                const result = req.getValidationResult();

                if (result > 0) {
                    return res.status(400).json({success: false, errors: result.mapped(), msg: 'Bad request'});
                }

                User
                    .findOne({email: req.body.email, type: req.body.type}).then(user=>{
                        if (!user) return res.status(401).json({success: false, error: 'User not found'});

                        return user.sendMailReset();

                }).then(user =>{
                    return res.json({success: true});
                }).catch(err => {
                    console.log('tr in catch post /reset:'+ err);
                    return res.status(401).json({success: false, error: err});
                })
    });

    /*router.get('/reset/:code', (req, res) => {
        if (!req.params.code) {
            return res.status(404).json({success:false, error: {msg:'Empty reset code'}});
        }
        User
            .findOne({changePwdCode: req.params.code})
            .then(user => {
                if (!user) {
                    throw {
                        msg: 'This session is not found'
                    };
                }
                return res.json({success: true, email: user.email});
            })
            .catch(err => {
                return res.status(400).json({success: false, error: err});
            });
    });*/

    /*router.post('/reset/:code', (req, res) => {
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
                user.lastDateResetPassword = Date.now();
                user.password = hash(req.body.password);
                user.changePwdCode = null;
                return user.save();
            })
            .then(user => res.json({success: true}))
            .catch(err => res.status(400).json({success: false, error: err}));
        });
    });*/

    router.get('/notifications', passport.authenticate('jwt', {session: false}), (req, res) => {
        Notification
            .aggregate([
                {
                    $match: {
                        $and: [
                            {type: 'message'},
                            {user: mongoose.Types.ObjectId(req.user._id)}
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$deal',
                        notifications: {
                            $sum: 1
                        },
                        created_at: {
                            $max: '$created_at'
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'deals',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'deal'
                    }
                },
                {
                    $unwind: '$deal'
                },
                {
                    $project: {
                        _id: 0,
                        created_at: 1,
                        deal: 1,
                        notifications: 1,
                        type: 'message'
                    }
                }
            ])
            .then(notifications => {
                Notification
                    .find({
                        $and: [
                            {
                                type: {
                                    $ne: 'message'
                                }
                            },
                            {
                                user: req.user._id
                            }
                        ]
                    })
                    .populate('sender', 'username')
                    .populate({path: 'deal', populate: [{path: 'exchange', select: ['tradeType']}]})
                    .then(_notifications => {
                        for (let i = 0; i < notifications.length; i++) {
                            _notifications.push(notifications[i]);
                        }
                        
                        _notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        return res.json(_notifications);
                    })
                    .catch(err => {
                        return res.status(400).json({success: false, error: err});
                    })
            });
    });

    router.post('/notifications', passport.authenticate('jwt', {session: false}), async (req, res) => {
        Notification.find({user: req.user._id})
            .then(notifications =>{
                if (!notifications) {
                    throw {
                        msg: 'not find notif'
                    };
                }
                Notification.update({user: req.user._id, viewed: false}, {$set: {viewed: true}}, {multi: true})
                    .then(function (notifications) { return res.json({success:true});
                });
            })
            .catch(err => res.status(400).json({success: false, error: err}))
    });

    //dashboard
    router.get('/dashboard', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try{
            if (req.user.type !== 'trust' || req.user.status !== 'active'){
                return res.status(403).json({success: false, message: 'Access denied'});
            }

            let user = await User.findOne({_id: req.user._id}).populate('trustWallet').populate('historyTransaction')
                .select({_id: 1, trustWallet: 1, type: 1, status: 1, total: 1, historyTransaction: 1});

            if (!user) {
                return res.status(404).json({success: false, message: 'User not found'});
            }

            let commissionWallet = await CommissionWallet.findOne();

            let payOutUser = [];
            for (let note of user.historyTransaction.inPlatform){
                if (note.fromUser === 'PayFair' && note.charge === true){
                    payOutUser.push(note);
                }
            }


            let allTrustWallets = await CWallet.find();
            let totalNode = new BigNumber(0);
            for (let currWallet of allTrustWallets){
                totalNode = totalNode.plus(currWallet.balancePfr);
            }
            totalNode = totalNode.idiv(10000);


            let countNode = new BigNumber(0);
            let balancePfr = new BigNumber(0);

            for (let currWallet of user.trustWallet){
                balancePfr = balancePfr.plus(currWallet.balancePfr);
            }

            countNode = balancePfr.idiv(10000);


            let arrAmountPayOut = [];
            for (let coin of commissionWallet.trust){
                let valueUserPayOut = new BigNumber(coin.amount)
                    .dividedBy(totalNode).multipliedBy(countNode).toFixed(8,1);

                arrAmountPayOut.push({name: coin.name, amount: +valueUserPayOut});
            }

            let countActiveDeals = await Deal.count({status: 'new'});
            let countUsers = await User.count({type: 'client'});
            let countEscrow = await User.count({type: 'escrow'});


            let dataDashBoard = {
                //arrays
                payOutUser: payOutUser,
                arrAmountPayOut: arrAmountPayOut,

                //
                countNode: countNode.toString(10),
                balancePfr: balancePfr.toString(10),
                totalNode: totalNode.toString(10),
                countActiveDeals: countActiveDeals,
                countUsers: countUsers,
                countEscrow: countEscrow,
            };

            return res.json({dataDashBoard: dataDashBoard});
        }
        catch (err) {
           console.log(err);
            return res.status(500).json(err);
        }
    });

    return router;
};