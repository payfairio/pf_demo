const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Exchange = new Schema({
    _id: Schema.Types.ObjectId,
    eId: {
        type: Number
    },
    owner : {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    tradeType: {
        type: String,
        required: true // 'sell', 'buy'
    },
    coin: {
        type: String, // 'BTC' 'ETH' 'PFR'
        required: true
    },
    currency: {
        type: String, // 'USD', 'RUB'
        required: true
    },
    paymentType: {
        type: String,
        required: true // 'Cash deposit', 'Transfers with specific bank', 'PayPal', etc.
    },
    paymentTypeDetail: {
        type: String
    },
    rate: {
        type: Number,
        required: true,
    },
    wallet: {
        type: String
    },
    limits: {
        min: Number,
        max: Number
    },
    status: {
        type: String,
        default: 'active'  // new, accepted, dispute, completed
    },
    conditions: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const counter = require('./Counter');

Exchange.pre('save', function(next) {
    if (this.isNew) {
        var doc = this;
        counter.findByIdAndUpdate({_id: 'exchanges'}, {$inc: {seq: 1}}, {
            new: true,
            upsert: true
        }, function (error, counter) {
            if (error)
                return next(error);
            doc.eId = counter.seq;
            next();
        });
    } else {
        next();
    }
});

module.exports = mongoose.model('Exchange', Exchange);