const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Suggestion = new Schema({
    _id: Schema.Types.ObjectId,
    name: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    like: {
        type: [String]
    },
    dislike: {
        type: [String]
    },
    status: { // Active, In Process, Approved, Disapproved
        type: String,
        default: "Active"
    }
});

module.exports = mongoose.model('Suggestion', Suggestion);