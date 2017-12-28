const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Account = new Schema({
    address: {
        type: String
    },
    privateKey: {
        type: String
    },
    coin: {
        type: String
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Account', Account);