const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommissionWallet = new Schema({
    trust: [{
        coin:{
            type: Schema.Types.ObjectId,
            ref: 'Crypto'
        },
        name:{
            type: String
        },
        amount: {
            type: String,
            default: '0'
        }
    }],
    escrow: [{
        coin:{
            type: Schema.Types.ObjectId,
            ref: 'Crypto'
        },
        name:{
            type: String
        },
        amount: {
            type: String,
            default: '0'
        }
    }],
    maintenance:[{
        coin:{
            type: Schema.Types.ObjectId,
            ref: 'Crypto'
        },
        name:{
            type: String
        },
        amount: {
            type: String,
            default: '0'
        }
    }]
});

module.exports = mongoose.model('CommissionWallet', CommissionWallet);