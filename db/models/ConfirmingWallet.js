const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConfirmingWallet = new Schema({
    address: {
        type: String,
        default: ''
    },
});

module.exports = mongoose.model('ConfirmingWallet', ConfirmingWallet);