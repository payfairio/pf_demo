var mongoose = require('mongoose');
var crypto = require('crypto');
var Schema = mongoose.Schema;

var User = new mongoose.Schema({
    _id: Schema.Types.ObjectId,
    username : {
        type: String,
        unique: true,
        required: true
    },
    email : {
        type: String,
        unique: true,
        required: true
    },
    password : {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    }
});

User.methods.comparePassword = function (passw) {
    return this.password === hash(passw);
};

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}

module.exports = mongoose.model('User', User);