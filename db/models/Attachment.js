const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Attachment = new Schema({
    file: {
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
    }
});

module.exports = mongoose.model('Attachment', Attachment);