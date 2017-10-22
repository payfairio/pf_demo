const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Deal = new Schema({
    _id: Schema.Types.ObjectId,
    dId: {
        type: Number
    },
    name: {
        type: String,
        required: true
    },
    seller : {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    buyer : {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    sum: {
        type: Number
    },
    sellerConditions: {
        type: String
    },
    buyerConditions: {
        type: String
    },
    messages : [{
        type: Schema.Types.ObjectId,
        ref: 'Message'
    }],
    status: {
        type: String,
        default: 'new'  // new, accepted, dispute, completed
    },
    acceptedBySeller: {
        type: Boolean,
        default: false
    },
    acceptedByBuyer: {
        type: Boolean,
        default: false
    },
    escrows: [
        {
            decision: {
                type: String // rejected, seller, buyer
            },
            escrow: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            created_at: {
                type: Date,
                default: Date.now
            }
        }
    ],
    disputeDecision: {
        type: String
    },
    wallet: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const CounterSchema = new Schema({
    _id: {type: String, required: true},
    seq: {
        type: Number,
        default: 0
    }
});
const counter = mongoose.model('Counter', CounterSchema);

Deal.pre('save', function(next) {
    if (this.isNew) {
        var doc = this;
        counter.findByIdAndUpdate({_id: 'deals'}, {$inc: {seq: 1}}, {
            new: true,
            upsert: true
        }, function (error, counter) {
            if (error)
                return next(error);
            doc.dId = counter.seq;
            next();
        });
    } else {
        next();
    }
});
Deal.methods.userHasAccess = function (user_id) {
    return this.seller.toString() === user_id || this.buyer.toString() === user_id;
};
Deal.methods.getUserRole = function (user_id) {
    if (this.seller._id.toString() === user_id) {
        return 'seller';
    }
    if (this.buyer._id.toString() === user_id) {
        return 'buyer';
    }
    var flag = false;
    this.escrows.forEach(function (item) {
        if (item.escrow.toString() === user_id) {
            flag = true;
        }
    });
    if (flag) {
        return 'escrow';
    }
    return false;
};
module.exports = mongoose.model('Deal', Deal);