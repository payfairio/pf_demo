var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Deal = new mongoose.Schema({
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
    messages : [{
        type: Schema.Types.ObjectId,
        ref: 'Message'
    }],
    status: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

var CounterSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    seq: {
        type: Number,
        default: 0
    }
});
var counter = mongoose.model('Counter', CounterSchema);

Deal.pre('save', function(next) {
    var doc = this;
    counter.findByIdAndUpdate({_id: 'deals'}, {$inc: { seq: 1} }, {new: true, upsert: true}, function(error, counter)   {
        if(error)
            return next(error);
        doc.dId = counter.seq;
        next();
    });
});

module.exports = mongoose.model('Deal', Deal);