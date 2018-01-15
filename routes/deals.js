const express = require('express');
const router = express.Router();

const User = require('../db/models/User.js');
const Deal = require('../db/models/Deal.js');
const Exchange = require('../db/models/Exchange.js');
const Notification = require('../db/models/Notification.js');

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
module.exports = function (web3) {
    router.get('/', passport.authenticate('jwt', {
        session: false
    }), function (req, res, next) {
        let status_filter = req.query.status == 0 ? {$or: [{status: 'new'}, {status: 'accepted'}, {status: 'dispute'}]} : {status: 'completed'};
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
                $project: {
                    dId: true,
                    name: true,
                    created_at: true,
                    seller: true,
                    buyer: true,
                    status: true,
                    coin: true,
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
                $addFields: {
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
                                $eq: ['$seller.email', req.user.email]
                            },
                            then: '$buyer.email',
                            else: '$seller.email'
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
                    [sortBy]: order
                }
            }, {
                $skip: +offset
            },
                {
                    $limit: +limit
                }
            ]).then(docs => {
                return res.json({total, data: docs});
            }).catch(error => {
                return res.json(error);
            });
        });
    });


    router.get('/dispute', passport.authenticate('jwt', {
        session: false
    }), function (req, res, next) {
        if (req.user.type !== 'escrow') {
            return res.status(403).json({
                error: "Forbidden"
            });
        }

        let status_filter = req.query.status == 0 ? {$or: [{status: 'new'}, {status: 'accepted'}, {status: 'dispute'}]} : {status: 'completed'};

        Deal.find({
            $and: [
                {"escrows.escrow": req.user._id},
                status_filter
            ]
        })
            .then(function (docs) {
                let deals = docs.map(function (deal) {
                    let escIndex = 0;
                    deal.escrows.forEach(function (esc, index) {
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
                deals.sort(function (a, b) {
                    if (a.called_at < b.called_at) {
                        return -1;
                    }
                    if (a.called_at > b.called_at) {
                        return 1;
                    }
                    return 0;
                });
                return res.json(deals);
            }).catch(function (err) {
            return res.json(err);
        });
    });

    router.get('/deal/:id', passport.authenticate('jwt', {
        session: false
    }), function (req, res, next) {
        Deal.findOne({
            dId: req.params.id
        }).populate('seller', ['-password', '-wallet']).populate('buyer', ['-password', '-wallet']).populate('messages')
            .then(function (doc) {
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
            }, function (err) {
                return res.status(500).json(err);
            });
    });

    router.post('/create', passport.authenticate('jwt', {
        session: false
    }), function (req, res, next) {
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
            conditions: {
                notEmpty: {
                    errorMessage: 'Please fill your conditions'
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
        req.getValidationResult().then(function (result) {
            if (result.array().length > 0) {
                return res.status(400).json({
                    success: false,
                    errors: result.mapped(),
                    msg: 'Bad request'
                });
            }

            User.findOne({
                email: req.body.counterparty
            }).then(function (doc) {
                return new Promise(function (resolve, reject) {
                    if (!doc) { // create user with status 'invited'
                        new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: req.body.counterparty,
                            type: 'client',
                            status: 'invited'
                        }).save(function (err, user) {
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
                        user.sendMailInviteNotification({
                            name: req.body.name,
                            email: req.user.email
                        }).then(function (mailData) {
                            resolve(user);
                        }, function (err) {
                            reject(err);
                        });
                    } else {
                        resolve(user);
                    }
                });
            }).then(function (user) {
                let data = {
                    _id: new mongoose.Types.ObjectId(),
                    name: req.body.name,
                    sum: req.body.sum,
                    coin: req.body.coin
                };
                if (req.body.role === 'seller') {
                    data.seller = req.user._id;
                    data.buyer = user._id;
                    data.sellerConditions = req.body.conditions;
                } else {
                    data.seller = user._id;
                    data.buyer = req.user._id;
                    data.buyerConditions = req.body.conditions;
                }
                return new Deal(data).save();
            }).then(function (result) {
                const notification = {
                    sender: req.user._id,
                    user: req.body.role === 'seller' ? result.buyer : result.seller,
                    deal: result._id,
                    type: 'newDeal',
                    text: result.name,
                };

                return new Notification(notification).save();
            }).then(function (notification) {
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

            }).catch(function (err) {
                return res.status(500).json({
                    success: false,
                    error: err
                });
            });
        });
    });


    router.post('/exchange', passport.authenticate('jwt', {
        session: false
    }), function (req, res, next) {
        if (req.user.type !== 'client') {
            return res.status(403).json({
                error: "Forbidden"
            });
        }
        req.checkBody({
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

        req.getValidationResult().then(function (result) {
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
            }).populate('owner', ['-password', '-wallet']).then(function (exchange) {
                let deal = {
                    _id: new mongoose.Types.ObjectId(),
                    name: 'Ex#' + exchange.eId + '. ' + exchange.tradeType + ' ' + exchange.coin + ' for ' + exchange.currency,
                    sum: req.body.sum,
                    coin: exchange.coin,
                    type: 'exchange',
                    exchange: exchange._id
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
            }).then(function(deal){
                const notification = {
                    sender: req.user._id,
                    user: owner,
                    deal: deal._id,
                    type: 'dealFromExchange',
                    text: deal.name,
                };

                return new Notification(notification).save().then(function (notification) {
                    return {deal: deal, notification: notification}
                });
            }).then(function (data) {
                Notification
                    .findById(data.notification._id)
                    .populate({path: 'deal', populate: [{path: 'exchange', select: ['tradeType']}]})
                    .populate('sender', 'username')
                    .then(function (notification) {
                        const io = req.app.io;
                        const clients = io.clients[data.notification.user._id];

                        if (clients) {
                            for (let client of clients) {
                                io.to(client).emit('notification', notification);
                            }
                        }
                    })
                return res.json({success: true, deal: data.deal});
            }).catch(function (err){
                console.log('/deals/exchange error:', err);
            });
        });
    });
    return router;
};
