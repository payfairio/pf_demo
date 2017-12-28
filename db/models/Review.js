const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Review = new Schema({
    _id: {
        type: Schema.Types.ObjectId
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    comment: {
        type: String
    },
    rating: {
        type: Number,
        default: 5
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    deal: {
        type: Schema.Types.ObjectId,
        ref: 'Deal'
    }
});

module.exports = mongoose.model('Review', Review);