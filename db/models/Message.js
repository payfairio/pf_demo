var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Message = new mongoose.Schema({
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
    }
});

module.exports = mongoose.model('Message', Message);