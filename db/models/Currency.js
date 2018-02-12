const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Currency = new Schema({
    name: {
        type: String
    },
    value: {
        type: String
    },
    date: {
        type: String
    }

}, { usePushEach: true });

module.exports = mongoose.model('Currency', Currency);