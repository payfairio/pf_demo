const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('../../config/database');

const SparkPost = require('sparkpost');
const mailClient = new SparkPost(config.mailApiKey);

const Invite = new Schema({
    email : {
        type: String,
        unique: true,
        required: true
    }
});

Invite.methods.sendMailNotification = function (offer) {
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

module.exports = mongoose.model('Invite', Invite);