const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const config = require('../../config/database');

const SparkPost = require('sparkpost');
const mailClient = new SparkPost(config.mailApiKey);
const User = new Schema({
    _id: Schema.Types.ObjectId,
    username : {
        type: String,
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
        required: true // client, escrow, trust
    },
    profileImg: {
        type: String,
    },
    status: { //unverified, active
        type: String,
        default: 'unverified'
    },
    wallet: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    holds: {
        type: Object,
        default: {
            eth: 0,
            pfr: 0,
            omg: 0
        }
    },
    online: {
        status: {
            type: Boolean,
            default: false
        },
        lastConnect: {
            type: Date,
            default: Date.now
        }
    },
    verifyCode: {
        type: String
    },
    changePwdCode: {
        type: String
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
            '<p><a href="'+config.frontUrl+'/#/register/'+this._id+'">JOIN</a></p>'+
            '</body></html>'
        },
        recipients: [
            {address: this.email}
        ]
    });
};

User.methods.sendMailVerification = function () {
    const _user = this;
    return new Promise( (resolve, reject) => {
        const verifyCode = crypto.createHash('md5').update(Date.now + '').digest("hex");
        return mailClient.transmissions.send({
            options: {
                transactional: true
            },
            content: {
                from: 'noreply@mail.payfair.io',
                subject: 'Please confirm your email address',
                html: '<html><body>'+
                '<p>We need to make sure you are human. Please verify your email.</p>' +
                '<p><a href="' + config.frontUrl + '/#/verify/' + verifyCode + '">Verify email</a></p>' +
                '</body></html>'
            },
            recipients: [
                {address: _user.email}
            ]
        }).then(function (res) {
            _user.verifyCode = verifyCode;
            return _user.save();
        }).then(function (user) {
            resolve(user);
        }).catch(function (err) {
            reject(err);
        });
    });
};

User.methods.sendMailReset = function () {
    let _user = this;
    return new Promise(function (resolve, reject) {
        let resetCode = crypto.createHash('md5').update(Date.now + '').digest("hex");
        return mailClient.transmissions.send({
            options: {
                transactional: true
            },
            content: {
                from: 'noreply@mail.payfair.io',
                subject: 'Reset password',
                html: '<html><body>'+
                '<p>Follow by <a href="' + config.frontUrl + '/#/reset/' + resetCode + '">link</a> for password reset</p>' +
                '</body></html>'
            },
            recipients: [
                {address: _user.email}
            ]
        }).then(function (res) {
            _user.changePwdCode = resetCode;
            return _user.save();
        }).then(function (user) {
            resolve(user);
        }).catch(function (err) {
            reject(err);
        });
    });
};

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}

module.exports = mongoose.model('User', User);