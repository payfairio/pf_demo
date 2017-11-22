const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Counter = new Schema({
    _id: {type: String, required: true},
    seq: {
        type: Number,
        default: 0
    }
});
module.exports = mongoose.model('Counter', Counter);