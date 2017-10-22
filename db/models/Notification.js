const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Notification = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    sender : {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    text : {
        type: String
    },
    deal : {
        type: Schema.Types.ObjectId,
        ref: 'Deal'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
    }
});

module.exports = mongoose.model('Notification', Notification);