const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HistoryTransaction = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    outsidePlatform:[{
        address: {
            type: String,
            default: null,
        },

        coinName: {
            type: String,
            default: null,
        },

        date:{
            type: Date,
            default: Date.now,
        },

        charge:{
            type: Boolean,
            default: null,
        },

        amount:{
            type: String,
            default: null,
        }
    }],

    inPlatform:[{
        fromUser: {
            type: String,
            default: null,
        },

        toUser: {
            type: String,
            default: null,
        },

        coinName: {
            type: String,
            default: null,
        },

        date:{
            type: Date,
            default: Date.now,
        },

        amount:{
            type: String,
            default: null,
        },

        dId:{
            type: String,
        },

        charge:{
            type: Boolean,
            default: null,
        },
    }],
});

module.exports = mongoose.model('HistoryTransaction', HistoryTransaction);