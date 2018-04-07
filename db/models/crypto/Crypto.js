const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Crypto = new Schema({
    name: {
        type: String
    },
    fullname: {
        type: String
    },
    address: {
        type: String
    },
    decimals: {
        type: Number
    },
    typeMonet: {
        type: String
    },
    active: {
        type: Boolean
    },
});



module.exports = mongoose.model('Crypto', Crypto);