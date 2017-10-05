const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const config = require('../../config/database');

const SparkPost = require('sparkpost');
const mailClient = new SparkPost(config.mailApiKey);

const User = Schema({
    _id: Schema.Types.ObjectId,
    username : {
        type: String,
        unique: true,
    },
    email : {
        type: String,
        unique: true,
        required: true
    },
    password : {
        type: String,
    },
    type: {
        type: String,
        required: true
    },
    profileImg: {
        type: String,
    },
    status: {
        type: String,
        default: 'active'
    }
});

User.methods.comparePassword = function (passw) {
    return this.password === hash(passw);
};

User.methods.sendMailInviteNotification = function (offer) {
    return mailClient.transmissions.send({
        options: {
            transactional: true
        },
        content: {
            from: 'noreply@mail.payfair.io',
            subject: 'Invite into deal',
            html: '<html><body>'+
            '<h2>You recieved invite into deal via payfair.io</h2>'+
            '<p>Deal name: '+offer.name+'</p>'+
            '<p>Invited by: '+offer.email+'</p>'+
            '<p><a href="'+config.frontUrl+'/#/register">JOIN</a></p>'+
            '</body></html>'
        },
        recipients: [
            {address: this.email}
        ]
    });
};

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}

module.exports = mongoose.model('User', User);