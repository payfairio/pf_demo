const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pendingDispute = new Schema({
    _id: Schema.Types.ObjectId,

    dispute_open_at: {
        type: Date,
        default: Date.now
    },

    deal:{
        type: Schema.Types.ObjectId,
        ref: 'Deal'
    }
});

module.exports = mongoose.model('pendingDispute', pendingDispute)