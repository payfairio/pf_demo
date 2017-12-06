const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Attachment = new Schema({
    name: {
        type: String
    },
    type: {
        type: String
    },
    message: {
        type: Schema.Types.ObjectId,
        ref: 'Message'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Attachment', Attachment);