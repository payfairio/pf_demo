const express = require('express');
const router = express.Router();

const User = require('../db/models/User.js');
const Deal = require('../db/models/Deal.js');
const Exchange = require('../db/models/Exchange.js');
const Notification = require('../db/models/Notification.js');
const Price = require('../db/models/Price.js');

const stringLodash = require('lodash/string');

const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);
const jwt = require('jsonwebtoken');

const validator = require('express-validator');


var req_body = null;//body of request
router.use(validator({
    customValidators: {
        checkOnBelongToLimits: (sum) => {
            return new Promise((resolve, reject) => {
                Exchange.findOne({_id: req_body.exchange}, function(err, doc){
                    if (err) {
                        reject();
                    } else if ((sum >= doc.limits.min) && (sum <= doc.limits.max)) {
                        resolve();
                    } else {
                        console.log('reject');
                        reject();
                    }
                });
            });
        }
    }
}));
module.exports = web3 => {
    router.get('/', passport.authenticate('jwt', {session: false}), (req, res) => {

        let status_filter = {$or: [{status: 'new'}, {status: 'accepted'}, {status: 'dispute'}]};

        if (req.query.status == 0) status_filter = {$or: [{status: 'new'}, {status: 'accepted'}, {status: 'dispute'}]};
        if (req.query.status == 1) status_filter = {status: 'completed'};
        if (req.query.status == 2) status_filter = {status: 'canceled'};

        let {
            offset,
            limit,
            order,
            sortBy
        } = req.query;
        order = order === 'true' ? -1 : 1;

        Deal.count({
            $and: [
                {
                    $or: [
                        {
                            'buyer': req.user._id
                        },
                        {
                            'seller': req.user._id
                        }
                    ]
                },
                status_filter
            ]
        }).then(total => {
                Deal.aggregate([{
                    $match: {
                        $and: [
                            {
                                $or: [
                                    {
                                        'buyer': req.user._id
                                    },
                                    {
                                        'seller': req.user._id
                                    }
                                ]
                            },
                            status_filter
                        ]
                    }
                }, {
                    $lookup: {
                        from: 'users',
                        localField: 'seller',
                        foreignField: '_id',
                        as: 'seller'
                    }
                }, {
                    $unwind: '$seller'
                }, {
                    $lookup: {
                        from: 'users',
                        localField: 'buyer',
                        foreignField: '_id',
                        as: 'buyer'
                    }
                }, {
                    $unwind: '$buyer'
                }, {
                    $lookup: {
                        from: 'messages',
                        localField: 'messages',
                        foreignField: '_id',
                        as: 'messages'
                    }
                }, {
                    $addFields: {
                        last_message: {
                            $cond: {
                                if: {
                                    $eq: [{$size: '$messages'}, 0]
                                },
                                then: null,
                                else: {$arrayElemAt: [ "$messages", -1 ]}
                            }
                            
                        }
                    }
                }, {
                    $lookup: {
                        from: 'users',
                        localField: 'last_message.sender',
                        foreignField: '_id',
                        as: 'last_message.sender'
                    }
                }, {
                    $project: {
                        dId: true,
                        name: true,
                        created_at: true,
                        seller: true,
                        buyer: true,
                        status: true,
                        coin: true,
                        'last_message.text': true,
                        'last_message.sender': '$last_message.sender.username',
                        'last_message.attachments': true,
                        'last_message.created_at': true,
                        'last_message.type': true,
                        new_messages: {
                            $filter: {
                                input: '$messages',
                                as: 'id',
                                cond: {
                                    $eq: [
                                        {$indexOfArray: ['$$id.viewed', req.user._id]},
                                        -1
                                    ]
                                }
                            }
                        }
                    }
                }, {
                    $project: {
                        'seller.password': false,
                        'seller.verifyCode': false,
                        'buyer.password': false,
                        'buyer.verifyCode': false,

                    }
                }, {
                    $addFields: {
                        new_messages: {
                            $size: '$new_messages'
                        },
                        role: {
                            $cond: {
                                if: {
                                    $eq: ['$seller.email', req.user.email]
                                },
                                then: 'seller',
                                else: 'buyer'
                            }
                        },
                        counterparty: {
                            $cond: {
                                if: {
                                    $eq: ['$seller.username', req.user.username]
                                },
                                then: '$buyer.username',
                                else: '$seller.username'
                            }
                        },
                        counterparty_id: {
                            $cond: {
                                if: {
                                    $eq: ['$seller.email', req.user.email]
                                },
                                then: '$buyer._id',
                                else: '$seller._id'
                            }
                        }
                    },
                }, {
                    $sort: {
                        [sortBy === 'messages' ? 'last_message.created_at' : sortBy]: order
                    }
                }, {
                    $skip: +offset
                }, {
                    $limit: +limit
                }
            ]).then(docs => {
                return res.json({total, data: docs});
            }).catch(error => {
                return res.json(error);
            });
        });
    });

    router.get('/stats', passport.authenticate('jwt', { session: false }), async (req, res) => {
        try {
            if (req.user.type !== 'trust' || req.user.status !== 'active'){
                return res.status(403).json({success: false, message: 'Access denied'});
            }

            const deals = await Deal.find().sort({ created_at: 1 });
            const price = await Price.find();

            let iter = 0;
            let hr24 = [];
            let all = [];
            let sum = 0;
            let volume = 0;
            for (let deal of deals) {
                if (deal.status === "completed") {
                    let value = price.find(function (element) {
                        return (element.name.toUpperCase() === deal.coin.toUpperCase());
                    }).value;

                    let temp = { coin: deal.coin, sum: deal.sum, volume: deal.sum * value };
                    if (new Date(deal.created_at) > new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * 1))) {
                        hr24.push(temp);
                    }
                    if (new Date(deal.created_at) > new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * (1 + iter)))) {
                        sum += deal.sum;
                        volume += deal.sum * value;
                    } else {
                        iter++;
                        all.push({ sum: sum, volume: volume });
                        sum = deal.sum;
                        volume = deal.sum * value;
                    }
                }
            }
            all.push({ sum: sum, volume: volume });

            return res.json({ hr24: hr24, all: all });
        } catch (err) {
            console.log(err);
            return res.status(500).json(err);
        }
    });

    router.get('/dispute', passport.authenticate('jwt', {session: false}), (req, res) => {
        if (req.user.type !== 'escrow') {
            return res.status(403).json({
                error: "Forbidden"
            });
        }

        let {order, sortBy} = req.query;
        order = order === 'true' ? -1 : 1;

        let status_filter = /*req.query.status == 0 ? */{$or: [{status: 'new'}, {status: 'accepted'}, {status: 'dispute'}]} /*: {status: 'completed'}*/;

        Deal.find({
            $and: [
                {"escrows.escrow": req.user._id},
                status_filter
            ]
        })
            .then(docs => {
                let deals = docs.map(deal => {
                    let escIndex = 0;
                    deal.escrows.forEach((esc, index) => {
                        if (esc.escrow.toString() === req.user._id.toString()) {
                            escIndex = index;
                        }
                    });
                    let tmp = Object.assign({}, deal._doc);
                    tmp.decision = deal.escrows[escIndex].decision ? deal.escrows[escIndex].decision : 'pending';
                    tmp.called_at = deal.escrows[escIndex].created_at;
                    delete tmp.escrows;
                    return tmp;
                });
                deals.sort((a, b) => {
                    if (sortBy === 'called_at'){
                        if (a.called_at < b.called_at) {
                            return order;
                        }
                        else return order*-1;
                    }
                    if (sortBy === 'created_at'){
                        if (a.created_at < b.created_at) {
                            return order;
                        }
                        else return order*-1;
                    }
                    if (sortBy === 'decision'){
                        if (a.decision < b.decision) {
                            return order;
                        }
                        else return order*-1;
                    }

                    if (sortBy === 'name'){
                        if (a.name < b.name) {
                            return order;
                        }
                        else return order*-1;
                    }
                    return 0;
                });
                return res.json(deals);
            }).catch(err => {
            return res.json(err);
        });
    });

    router.get('/deal/:id', passport.authenticate('jwt', {session: false}), (req, res) =>  {
        Deal.findOne({
            dId: req.params.id
        }).populate('seller', ['-password', '-wallet']).populate('buyer', ['-password', '-wallet']).populate('messages')
            .then(doc => {
                if (!doc) {
                    return res.status(404).json({
                        error: "Deal not found"
                    });
                }
                if (doc.seller._id.toString() !== req.user._id && doc.buyer._id.toString() !== req.user._id) {
                    return res.status(403).json({
                        error: "Forbidden"
                    });
                }
                return res.json(doc);
            }, err => {
                return res.status(500).json(err);
            });
    });

    router.post('/create', passport.authenticate('jwt', {session: false}), (req, res) => {
        if (req.user.type !== 'client') {
            return res.status(403).json({
                error: "Forbidden"
            });
        }
        req.checkBody('counterparty', 'Not allowed to add yourself as counterparty').not().equals(req.user.email);
        req.checkBody({
            role: {
                notEmpty: {
                    errorMessage: 'Role is required'
                }
            },
            coin: {
                notEmpty: {
                    errorMessage: 'Currency is required'
                },
                isIn: {
                    options: [['PFR', 'ETH', 'OMG']],
                    errorMessage: 'Wrong currency'
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
            },
            conditions:{
                isLength: {
                    options: {
                        max: 700
                    },
                    errorMessage: 'Too many characters (maximum 700)'
                }
            },
            sum: {
                notEmpty: {
                    errorMessage: 'Sum is required'
                },
                matches: {
                    options: /^([0-9]+[.])?[0-9]+$/i,
                    errorMessage: 'Wrong sum. Use only digits and one dot'
                }
            },
        });
        req.getValidationResult().then(result => {
            if (result.array().length > 0) {
                return res.status(400).json({
                    success: false,
                    errors: result.mapped(),
                    msg: 'Bad request'
                });
            }
            User.findOne({email: req.body.counterparty}).then(doc => {
                return new Promise((resolve, reject) => {
                    if (!doc) { // create user with status 'invited'
                        new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: req.body.counterparty,
                            type: 'client',
                            status: 'invited'
                        }).save((err, user) => {
                            if (err) {
                                reject(err);
                            }
                            resolve(user);
                        });
                    } else { // there is active or already invited user
                        resolve(doc);
                    }
                });
            }).then(user => {
                return new Promise((resolve, reject) => {
                    if (user.status === 'invited') {
                        user.sendMailInviteNotification({
                            name: req.body.name,
                            email: req.user.email
                        }).then(mailData => {
                            resolve(user);
                        }).catch(err => {
                            reject(err);
                        });
                    } else {
                        resolve(user);
                    }
                });
            }).then(user => {
                let data = {
                    _id: new mongoose.Types.ObjectId(),
                    name: stringLodash.escape(req.body.name),
                    sum: stringLodash.escape(req.body.sum),
                    coin: stringLodash.escape(req.body.coin.toUpperCase())
                };
                if (req.body.role === 'seller') {
                    data.seller = req.user._id;
                    data.buyer = user._id;
                    data.sellerConditions = stringLodash.escape(req.body.conditions);
                } else {
                    data.seller = user._id;
                    data.buyer = req.user._id;
                    data.buyerConditions = stringLodash.escape(req.body.conditions);
                }
                return new Deal(data).save();
            }).then(result => {
                const notification = {
                    sender: req.user._id,
                    user: req.body.role === 'seller' ? result.buyer : result.seller,
                    deal: result._id,
                    type: 'newDeal',
                    text: result.name,
                };

                return new Notification(notification).save();
            }).then(notification => {
                Notification.findById(notification._id)
                    .populate('deal')
                    .populate('sender', 'username')
                    .then(notification => {
                        const io = req.app.io;
                        const clients = io.clients[notification.user];

                        if (clients) {
                            for (let client of clients) {
                                io.to(client).emit('notification', notification);
                                notification.viewed = true;
                                notification.save();
                            }
                        }
                    });

                Deal.findById(notification.deal)
                    .then(deal => {
                        return res.json({
                            success: true,
                            deal: deal
                        });
                    });

            }).catch(err => {
                return res.status(500).json({
                    success: false,
                    error: err
                });
            });
        });
    });

    router.post('/exchange', passport.authenticate('jwt', {session: false}), (req, res) => {
            if (req.user.type !== 'client') {
                return res.status(403).json({
                    error: "Forbidden"
                });
            }
            req_body = req.body;
            req.checkBody({
                sum: {
                    notEmpty: {
                        errorMessage: 'Sum is required'
                    },
                    matches: {
                        options: /^([0-9]+[.])?[0-9]+$/i,
                        errorMessage: 'Wrong sum. Use only digits and one dot'
                    },
                    checkOnBelongToLimits: {
                        errorMessage: 'sum is not belong of limits',
                    }
                },
            });

            req.getValidationResult().then(
                result => {
                    if (result.array().length > 0) {
                        return res.status(400).json({
                            success: false,
                            errors: result.mapped(),
                            msg: 'Bad request'
                        });
                    }

                    let owner = null;

                    Exchange.findOne({
                        _id: req.body.exchange
                    }).populate('owner', ['-password', '-wallet'])
                      .then(exchange => {
                        let deal = {
                            _id: new mongoose.Types.ObjectId(),
                            name: 'Ex#' + exchange.eId + '. ' + exchange.tradeType + ' ' + exchange.coin + ' for ' + exchange.currency,
                            sum: req.body.sum,
                            coin: exchange.coin.toUpperCase(),
                            type: 'exchange',
                            exchange: exchange._id,
                            rate: exchange.rate,
                            currency: exchange.currency,
                        };

                        owner = exchange.owner;

                        if (exchange.tradeType === 'sell') {
                            deal.seller = req.user._id;
                            deal.buyer = exchange.owner;
                            deal.buyerConditions = exchange.conditions+" \n\n1"+exchange.coin+" = "+exchange.rate+exchange.currency;
                        } else {
                            deal.seller = exchange.owner;
                            deal.buyer = req.user._id;
                            deal.sellerConditions = exchange.conditions+" \n\n1"+exchange.coin+" = "+exchange.rate+exchange.currency;
                        }
                        return new Deal(deal).save();
                    }).then(deal => {
                        const notification = {
                            sender: req.user._id,
                            user: owner,
                            deal: deal._id,
                            type: 'dealFromExchange',
                            text: deal.name,
                        };

                        return new Notification(notification).save().then(notification => {
                            return {deal: deal, notification: notification}
                        });
                    }).then(data => {
                        Notification
                            .findById(data.notification._id)
                            .populate({path: 'deal', populate: [{path: 'exchange', select: ['tradeType']}]})
                            .populate('sender', 'username')
                            .then(notification => {
                                const io = req.app.io;
                                const clients = io.clients[data.notification.user._id];

                                if (clients) {
                                    for (let client of clients) {
                                        io.to(client).emit('notification', notification);
                                    }
                                }
                            });
                        return res.json({success: true, deal: data.deal});
                    }).catch(err => {
                        console.log('/deals/exchange error:', err);
                    });
                }
            )
        });

    router.post('/cancel/:id', passport.authenticate('jwt', {session: false}), (req, res) =>  {
        Deal.findOne({
            dId: req.params.id
        }).populate('seller', ['_id', 'username']).populate('buyer', ['_id', 'username']).populate('messages')
            .then(doc => {
                if (!doc) {
                    return res.status(404).json({
                        error: "Deal not found"
                    });
                }
                if (doc.seller._id.toString() !== req.user._id && doc.buyer._id.toString() !== req.user._id) {
                    return res.status(403).json({
                        error: "Forbidden"
                    });
                }
                if (doc.status !== 'new') {
                    return res.status(403).json({
                        error: "You can't cancel this deal"
                    });
                }
                return doc.remove();
            })
            .then(doc => {
                return res.json(doc);
            })
            .catch(err => {
                return res.status(500).json(err);
            });
    });

    return router;
};
