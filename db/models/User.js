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
    status: { //unverified, active, invited
        type: String,
        default: 'unverified'
    },
    statusEscrowBool:{
        type: Boolean,
    },
    wallet: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    trustWallet: {
        type: Schema.Types.ObjectId,
        ref: 'ConfirmingWallet'
    },
    total:[{
        coin:{
            type: Schema.Types.ObjectId,
            ref: 'Crypto'
        },
        name:{
            type: String
        },
        amount: {
            type: String,
            default: '0'
        }
    }],
    holds: {
        type: Object,
        default: {
            eth: 0,
            pfr: 0,
            omg: 0
        }
    },
    historyTransaction:{
        type: Schema.Types.ObjectId,
        ref: 'HistoryTransaction'
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
    },
    lastDateResetPassword:{
        type: Date,
    },
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
            '<p><a href="'+config.frontUrl+'/register/'+this._id+'">JOIN</a></p>'+
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
        const verifyCode = crypto.createHash('md5').update(Date.now+'_'+_user._id).digest("hex");
        const url = _user.type === 'client'
            ? config.frontUrl 
            : _user.type === 'escrow'
                ? config.escrowUrl
                : config.trustUrl;
        return mailClient.transmissions.send({
            options: {
                transactional: true
            },
            content: {
                from: 'noreply@mail.payfair.io',
                subject: 'Please confirm your email address',
                html: '<html><body>'+
                '<p>We need to make sure you are human. Please verify your email.</p>' +
                '<p><a href="' + url + '/verify/' + verifyCode + '">Verify email</a></p>' +
                '</body></html>'
            },
            recipients: [
                {address: _user.email}
            ]
        }).then(res => {
            _user.verifyCode = verifyCode;
            return _user.save();
        }).then(user => {
            resolve(user);
        }).catch(err => {
            reject(err);
        });
    });
};

User.methods.sendMailReset = function () {
    const _user = this;
    return new Promise(function (resolve, reject) {
        let resetCode = crypto.createHash('md5').update(Date.now+'_'+_user._id).digest("hex");

        const url = _user.type === 'client'
            ? config.frontUrl 
            : _user.type === 'escrow'
                ? config.escrowUrl
                : config.trustUrl;

        return mailClient.transmissions.send({
            options: {
                transactional: true
            },
            content: {
                from: 'noreply@mail.payfair.io',
                subject: 'Reset password',
                html: '<html><body>'+
                '<p>Follow by <a href="' + config.backendUrl + '/resetPwd/' + resetCode + '">link</a> for password reset</p>' +
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