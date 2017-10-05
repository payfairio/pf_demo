const socketioJwt = require('socketio-jwt');
const config = require('./config/database');

const User = require('./db/models/User.js');
const Deal = require('./db/models/Deal.js');
const Message = require('./db/models/Message.js');

module.exports = function(server) {
    const io = require('socket.io')(server);
    var clients = {};
    io.on('connection', socketioJwt.authorize({
        secret: config.secret,
    })).on('authenticated', function(client) {
        clients[client.decoded_token._id] = client.id;

        client.on('join_chat', function (data) {
            Deal.findOne({dId: data.deal_id}).populate({path: 'messages', populate: {path: 'sender', select: '-password'}})
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
                .then(function (deal) {
                    if (!deal) {
                        return;
                    }
                    let role = deal.getUserRole(client.decoded_token._id);
                    if (role) {
                        client.emit('initMessages', {messages: deal.messages, counterparty: (role === 'seller' ? deal.buyer : deal.seller)});
                        client.join(deal._id.toString());
                    }
                })
                .catch(function (err) {

                });
        });
        client.on('leave_chat', function (data) {
            client.leave(data.deal_id);
        });

        client.on('message', function(data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
                .then(function (deal) {
                   if (!deal) {
                       return;
                   }
                   let role = deal.getUserRole(client.decoded_token._id)
                   if (role) {
                       client.broadcast.to(clients[role === 'seller' ? deal.buyer._id : deal.seller._id]).emit('notification', {type: 'message', deal: deal._id});
                       data.sender = client.decoded_token;
                       data.created_at = new Date();
                       let message = {
                           sender: client.decoded_token._id,
                           text: data.text,
                           deal: deal._id
                       };
                       new Message(message).save()
                           .then(function (message) {
                               deal.messages.push(message._id);
                               deal.save()
                                   .then(function (doc) {
                                       io.in(deal._id.toString()).emit('message', data);
                                   })
                                   .catch(function (err) {

                                   });
                           })
                           .catch(function (err) {

                           });
                   }
                })
                .catch(function (err) {

                });
        });

        client.on('accept_deal_condition', function (data) {

        });
        client.on('set_deal_sum', function (data) {

        });

        client.on('disconnect', function () {
            delete clients[client.decoded_token._id];
        });
    });
};