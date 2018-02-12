const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Price = new Schema({
    _id: Schema.Types.ObjectId,
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

module.exports = mongoose.model('Price', Price);