const express = require('express');
const router = express.Router();

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

router.get('/', passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    let {
        offset,
        limit,
        order,
        sortBy
    } = req.query;
    order = order === 'true' ? -1 : 1;
    Deal.aggregate([{
            $match: {
                $or: [{
                    'buyer': req.user._id
                }, {
                    'seller': req.user._id
                }]
            }
        }, {
            $project: {
                dId: true,
                name: true,
                created_at: true,
                seller: true,
                buyer: true
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
                }
            }
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
        return res.json(docs);
    }).catch(error => {
        return res.json(error);
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
    Deal.find({
            "escrows.escrow": req.user._id
        })
        .then(function (docs) {
            let deals = docs.map(function (deal) {
                let escIndex = 0;
                deal.escrows.forEach(function (esc, index) {
                    if (esc.escrow === req.user._id) {
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
        }).populate('seller').populate('buyer').populate('messages')
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
                sum: req.body.sum
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
            return res.json({
                success: true,
                deal: result
            });
        }).catch(function (err) {
            return res.status(500).json({
                success: false,
                error: err
            });
        });
    });
});

module.exports = router;