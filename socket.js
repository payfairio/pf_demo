const socketioJwt = require('socketio-jwt');
const config = require('./config/database');
const mongoose = require('mongoose');

const User = require('./db/models/User.js');
const Deal = require('./db/models/Deal.js');
const Message = require('./db/models/Message.js');
const Attachment = require('./db/models/Attachment.js');

const Review = require('./db/models/Review.js');
const Notification = require('./db/models/Notification.js');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);
const config_crypto = require('./config/crypto');

// on client first call and on decision of prev escrow
const findEscrows = deal => {
    const used_ids = deal.escrows.map(escrow => escrow.escrow);
    return User.find({$and: [{type: 'escrow'}, {_id: {$nin: used_ids}}]});
};

const sendCoins = async (deal, from_id, to_id, sum, coin) => { // todo: error handling
    const from_user = await User.findById(from_id).populate('wallet');
    const to_user = await User.findById(to_id).populate('wallet');
    let count = 0;
    let txData = null;
    let receipt = null;
    switch (config_crypto[coin.toLowerCase()].type) {
        case 'erc20':
            amount = sum * Math.pow(10, config_crypto[coin.toLowerCase()].decimals);
            const contract = new web3.eth.Contract(require('./abi/'+coin.toLowerCase()+'/Token.json'), config_crypto[coin.toLowerCase()].address);
            // transfer
            count = await web3.eth.getTransactionCount(from_user.wallet.address);
            // Choose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!
            /*let gasLimit = await web3.eth.estimateGas({
             nonce: count,
             to: config_crypto[coin.toLowerCase()].address,
             data: contract.methods.transfer(toAddress, amount).encodeABI()
             });*/
            txData = await web3.eth.accounts.signTransaction({
                to: config_crypto[coin.toLowerCase()].address,
                gas: 110000,//gasLimit,
                gasPrice: await web3.eth.getGasPrice(),
                data: contract.methods.transfer(to_user.wallet.address, amount).encodeABI(),
                nonce: count
            }, from_user.wallet.privateKey);
            receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
            from_user.holds[coin.toLowerCase()] -= parseFloat(sum);
            from_user.markModified('holds.'+coin.toLowerCase());
            await from_user.save();
            return true;
        case 'eth':
            amount = web3.utils.toWei(sum, 'ether');
            // transfer
            count = await web3.eth.getTransactionCount(from_user.wallet.address);
            // I chose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!
            let gasLimit = await web3.eth.estimateGas({
                nonce: count,
                to: to_user.wallet.address,
                value: amount
            });
            txData = await web3.eth.accounts.signTransaction({
                to: to_user.wallet.address,
                gas: gasLimit,
                gasPrice: await web3.eth.getGasPrice(),
                value: amount,
                nonce: count
            }, from_user.wallet.privateKey);
            receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
            from_user.holds.eth -= parseFloat(sum);
            from_user.markModified('holds.eth');
            await from_user.save();
            return true;
    }
};

const checkDispute = decisions => {
    if (decisions.length < 3) {
        return null;
    }
    let prev = null;
    let count = 0;
    for (let i = decisions.length - 1; i >= 0; i--) {
        if (decisions[i].decision === 'rejected') {
            continue;
        }
        if (!prev) {
            prev = decisions[i].decision;
            continue;
        }
        if (decisions[i].decision === prev) {
            count++;
            if (count === 2) {
                return prev;
            }
        } else {
            return null;
        }
    }
};

const checkNotifications = (deal, user) => {
    return new Promise((resolve, reject) => {
        Notification
            .find({
                user: user,
                deal: deal,
                type: 'message'
            })
            .remove()
            .then(notifications => {
                return Notification
                    .aggregate([
                        {
                            $match: {
                                $and: [
                                    {type: 'message'},
                                    {user: mongoose.Types.ObjectId(user)}
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: '$deal',
                                notifications: {
                                    $sum: 1
                                },
                                created_at: {
                                    $max: '$created_at'
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'deals',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'deal'
                            }
                        },
                        {
                            $unwind: '$deal'
                        },
                        {
                            $project: {
                                _id: 0,
                                created_at: 1,
                                deal: 1,
                                notifications: 1,
                                type: 'message'
                            }
                        }
                    ])
            .then(notifications => {
                return Notification
                    .update({user: user, deal: deal, viewed: false}, {$set: {viewed: true}}, {multi: true})
                    .then(_notifications => {
                        return Notification
                            .find({
                                $and: [
                                    {
                                        type: {
                                            $ne: 'message'
                                        }
                                    },
                                    {
                                        user: user
                                    }
                                ]
                            })
                            .populate('sender', 'username')
                            .populate({path: 'deal', populate: [{path: 'exchange', select: ['tradeType']}]});
                    })
                    .then(_notifications => {
                        for (let i = 0; i < notifications.length; i++) {
                            _notifications.push(notifications[i]);
                        }
                        
                        _notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        resolve(_notifications);
                    })
                    .catch(err => {
                        reject(err);
                    });
                });
            })
            .catch(err => {
                reject(err);
            })
    });
};

const checkUserInRoom = (clients, room) => {
    for (let client of clients) {
        if (room[client]) {
            return true;
        }
    }
    return false;
};

module.exports = (server, app) => {
    const io = require('socket.io')(server);

    const clients = {};
    app.io = io;
    io.clients = clients;
    
    io.on('connection', socketioJwt.authorize({
        secret: config.secret,
    })).on('authenticated', client => {
        client.emit('authorized');

        if (!clients[client.decoded_token._id]) {
            clients[client.decoded_token._id] = [];
        }
        clients[client.decoded_token._id].push(client.id);

        User
            .findById(client.decoded_token._id)
            .then(doc => {
                if (doc) {
                    doc.online.status = true;
                    doc.online.lastConnect = new Date();
                    return doc.save();
                }
            }).then().catch(err => {console.log('Online status error:', err)});

        // attachments in chats
        require('./socket/uploads')(client);

        client.on('join_chat',  data => {
            Deal.findOne({dId: data.deal_id}).populate({path: 'messages', populate: [{path: 'sender', select: ['-password', '-wallet']}, {path: 'attachments'}]})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then (deal => {
                    if (!deal) {
                        return;
                    }
                    let role = deal.getUserRole(client.decoded_token._id);
                    if (role) {
                        if (role === 'escrow') {
                            let escIndex = 0;
                            deal.escrows.forEach((esc, index) => {
                                if (esc.escrow.toString() === client.decoded_token._id.toString()) {
                                    escIndex = index;
                                }
                            });
                            let tmp = Object.assign({}, deal._doc);
                            tmp.decision = deal.escrows[escIndex].decision ? deal.escrows[escIndex].decision : 'pending';
                            delete tmp.escrows;
                            client.emit('initMessages', {
                                deal: tmp,
                                messages: deal.messages,
                                notifications: notifications
                            });

                            //need to set 'join_at' value to escrow
                            deal.escrows[escIndex].join_at = new Date();
                            deal.save().then().catch(err => {console.log(err)});
                        } else {
                            if (deal.status === 'completed'){
                                Review.find({deal: deal._id, author: client.decoded_token._id}).then(doc => {
                                    let can_review = false;
                                    if (!doc.length){
                                        can_review = true;
                                    }
                                        
                                    client.emit('initMessages', {
                                        deal: deal,
                                        messages: deal.messages,
                                        counterparty: (role === 'seller' ? deal.buyer : deal.seller),
                                        can_review: can_review
                                    });
                                });
                            } else {
                                client.emit('initMessages', {
                                    deal: deal,
                                    messages: deal.messages,
                                    counterparty: (role === 'seller' ? deal.buyer : deal.seller)
                                });
                            }
                        }
                        client.join(deal._id.toString());
                        return deal;
                    }
                })
                .then(deal => {
                    Message.update({deal: deal._id}, {$addToSet: {viewed: client.decoded_token._id}}, {multi: true}).then();
                    checkNotifications(deal._id, client.decoded_token._id).then(notifications => {
                        client.emit('notifications', notifications);
                    });
                })
                .catch(err => {
                    console.log(err);
                });
        });


        client.on('leave_chat', data => {
            Deal.findOne({dId: data.deal_id})
                .then(deal => {
                    client.leave(deal._id);
                });
        });

        client.on('message', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise((resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role) {
                            //client.broadcast.to(clients[role === 'seller' ? deal.buyer._id : deal.seller._id]).emit('notification', {type: 'message', deal: deal._id});
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'message';
                            let message = {
                                sender: client.decoded_token._id,
                                text: data.text,
                                deal: deal._id,
                                type: data.type,
                                attachments: data.attachments.map(item => item._id),
                                viewed: [
                                    client.decoded_token._id
                                ]
                            };
                            new Message(message).save((err, message) => {
                                if (err) {
                                    reject(err);
                                }
                                Attachment.update({_id: {$in: data.attachments.map(item => item._id)}}, {$set: {message: message._id}}, () => {
                                    resolve({role: role, deal: deal, message: message});
                                });
                            });

                        } else {
                            reject({});
                        }
                    });

                })
                .then(data => {
                    return new Promise ((resolve, reject) => {
                        const role = data.role;
                        const deal = data.deal;
                        const sender = role === 'buyer' ? deal.buyer._id : deal.seller._id;
                        const user = role === 'seller' ? deal.buyer._id : deal.seller._id;

                        data.deal.messages.push(data.message._id);
                        data.deal
                            .save()
                            .then(deal => {
                                if (!checkUserInRoom(clients[user], io.sockets.adapter.rooms[data.deal._id].sockets)) {
                                    const notification = {
                                        sender: sender,
                                        user: user,
                                        deal: deal._id,
                                        type: 'message',
                                        text: data.message.text,
                                    };
        
                                    new Notification(notification)
                                        .save()
                                        .then(notification => {
                                            resolve({deal: data.deal, notification: notification})
                                        });
                                } else {
                                    resolve({deal: data.deal});
                                }
                            });
                    })
                })
                .then(_data => {
                    let deal_id = _data.deal ? _data.deal._id : _data.notification.deal;
                    io.in(deal_id.toString()).emit('message', data);

                    if (_data.notification) {
                        Notification
                            .findById(_data.notification._id)
                            .populate('deal')
                            .populate('sender', 'username')
                            .then(notification => {
                                const clients = io.clients[notification.user];
                                if (clients) {
                                    for (let client of clients) {
                                        io.to(client).emit('notification', notification);
                                    }
                                }
                            });
                    }
                })
                .catch(err => {
                    console.log(err);
                });
        });

        client.on('accept_deal_condition', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise((resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'new') {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role) {
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'system';
                            data.text = 'Accepted deal sum and conditions';
                            let message = {
                                sender: client.decoded_token._id,
                                text: data.text,
                                deal: deal._id,
                                type: data.type
                            };
                            switch (role) {
                                case 'seller':
                                    deal.acceptedBySeller = true;
                                    break;
                                case 'buyer':
                                    deal.acceptedByBuyer = true;
                                    break;
                            }
                            if (deal.acceptedBySeller && deal.acceptedByBuyer) {
                                deal.status = 'accepted';
                            }
                            if (deal.status === 'new') {
                                new Message(message).save((err, message) => {
                                    if (err) {
                                        reject(err);
                                    }
                                    resolve({deal: deal, message: message, role: role});
                                });
                            } else {
                                // deal accepted
                                let messages = [message];
                                messages.push({
                                    deal: message.deal,
                                    type: message.type,
                                    text: 'Terms, conditions and sum of deal were accepted by both parties. Trade sum is transferred to a deposit until the end of the trade.',
                                });
                                Message.insertMany(messages).then(messages => {
                                    resolve({deal: deal, messages: messages, role: role});
                                }, err => {
                                    reject(err);
                                });
                            }
                        } else {
                            reject({});
                        }
                    });
                })
                .then(data => {
                    return new Promise((resolve, reject) => {
                        if (data.role && data.role === 'buyer'){
                            User.findById(client.decoded_token._id).populate('wallet').then(async user => {
                                let balance = 0;
                                if (!config_crypto.hasOwnProperty(data.deal.coin.toLowerCase())) {
                                    reject({success: false, message: 'Wrong coin'});
                                }
                                switch (config_crypto[data.deal.coin.toLowerCase()].type) {
                                    case 'erc20':
                                        const contract = new web3.eth.Contract(require('./abi/'+data.deal.coin.toLowerCase()+'/Token.json'), config_crypto[data.deal.coin.toLowerCase()].address);
                                        balance = await contract.methods.balanceOf(user.wallet.address).call();
                                        if (balance - user.holds[data.deal.coin.toLowerCase()] * Math.pow(10, config_crypto[data.deal.coin.toLowerCase()].decimals) < data.deal.sum * Math.pow(10, config_crypto[data.deal.coin.toLowerCase()].decimals)) {
                                            client.emit('NotEnoughMoney');
                                            reject({});
                                        }
                                        break;
                                    case 'eth':
                                        balance = await web3.eth.getBalance(user.wallet.address);
                                        if (balance - web3.utils.toWei(user.holds.eth.toString(), 'ether') < web3.utils.toWei(data.deal.sum.toString(), 'ether') ) {
                                            client.emit('NotEnoughMoney');
                                            reject({});
                                        }
                                        break;
                                }
                                if (data.messages) {
                                    user.holds[data.deal.coin.toLowerCase()] += data.deal.sum;
                                    user.markModified('holds.'+data.deal.coin.toLowerCase());
                                }
                                return user.save();
                            })
                            .then(user => {
                                resolve(data);
                            })
                            .catch(err => {
                                reject(err);
                            });
                        } else {
                            resolve(data);
                        }
                    });
                })
                .then(data => {
                    if (data.message) {
                        data.deal.messages.push(data.message._id);
                    } else if (data.messages) {
                        data.messages.forEach(item => {
                            data.deal.messages.push(item);
                        });
                    }
                    return data.deal.save();
                })
                .then(deal => {
                    io.in(deal._id.toString()).emit('dealConditionsAccepted', data);

                    let user = deal.buyer._id.toString() == client.decoded_token._id.toString() ? deal.seller._id : deal.buyer._id;

                    const notification = {
                        sender: client.decoded_token._id,
                        user: user,
                        deal: deal._id,
                        type: 'dealConditionsAccepted',
                        text: 'conditions accepted',
                    };

                    return new Notification(notification).save();
                })
                .then(notification => {
                    Notification
                        .findById(notification._id)
                        .populate('deal')
                        .populate('sender', 'username')
                        .then(notification => {
                            const clients = io.clients[notification.user];
                            if (clients) {
                                for (let client of clients) {
                                    io.to(client).emit('notification', notification);
                                }
                            }
                        });
                })
                .catch(err => {
                    console.log(err);
                });
        });

        client.on('set_deal_sum', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise((resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'new') {
                            reject({});
                        }
                        if (!(/^([0-9]+[.])?[0-9]+$/i.test(data.sum))) {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role) {
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'system';
                            data.text = 'Deal sum changed to '+data.sum+'ETH';
                            let message = {
                                sender: client.decoded_token._id,
                                text: data.text,
                                deal: deal._id,
                                type: data.type
                            };
                            switch (role) {
                                case 'seller':
                                    deal.acceptedByBuyer = false;
                                    break;
                                case 'buyer':
                                    deal.acceptedBySeller = false;
                                    break;
                            }
                            deal.sum = data.sum;
                            new Message(message).save((err, message) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve({deal: deal, message: message});
                            });
                        } else {
                            reject({});
                        }
                    });
                })
                .then(data => {
                    data.deal.messages.push(data.message._id);
                    return data.deal.save();
                })
                .then(deal => {
                    io.in(deal._id.toString()).emit('changeDealSum', data);

                    let user = deal.buyer._id.toString() == client.decoded_token._id.toString() ? deal.seller._id : deal.buyer._id;

                    const notification = {
                        sender: client.decoded_token._id,
                        user: user,
                        deal: deal._id,
                        type: 'changeDealSum',
                        text: 'New sum:' + deal.sum,
                    };

                    return new Notification(notification).save();
                })
                .then(notification => {
                    Notification
                        .findById(notification._id)
                        .populate('deal')
                        .populate('sender', 'username')
                        .then(notification => {
                            const clients = io.clients[notification.user];
                            if (clients) {
                                for (let client of clients) {
                                    io.to(client).emit('notification', notification);
                                }
                            }
                        });
                })
                .catch(err => {
                    console.log(err);
                });
        });

        client.on('set_deal_condition', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise((resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'new') {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role) {
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'system';
                            data.text = 'Deal conditions changed to: '+data.conditions;
                            let message = {
                                sender: client.decoded_token._id,
                                text: data.text,
                                deal: deal._id,
                                type: data.type
                            };
                            switch (role) {
                                case 'seller':
                                    deal.sellerConditions = data.conditions;
                                    deal.acceptedByBuyer = false;
                                    break;
                                case 'buyer':
                                    deal.buyerConditions = data.conditions;
                                    deal.acceptedBySeller = false;
                                    break;
                            }
                            new Message(message).save((err, message) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve({deal: deal, message: message});
                            });
                        } else {
                            reject({});
                        }
                    });
                })
                .then(data => {
                    data.deal.messages.push(data.message._id);
                    return data.deal.save();
                })
                .then(deal => {
                    io.in(deal._id.toString()).emit('changeDealConditions', data);

                    let user = deal.buyer._id.toString() == client.decoded_token._id.toString() ? deal.seller._id : deal.buyer._id;

                    const notification = {
                        sender: client.decoded_token._id,
                        user: user,
                        deal: deal._id,
                        type: 'changeDealConditions',
                        text: data.conditions,
                    };

                    return new Notification(notification).save();
                })
                .then(notification => {
                    Notification
                        .findById(notification._id)
                        .populate('deal')
                        .populate('sender', 'username')
                        .then(notification => {
                            const clients = io.clients[notification.user];
                            if (clients) {
                                for (let client of clients) {
                                    io.to(client).emit('notification', notification);
                                }
                            }
                        });
                })
                .catch(err => {
                    console.log(err);
                });
        });

        client.on('accept_deal', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise(async (resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'accepted') {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role === 'buyer') { // only buyer can accept deal without escrows
                            sendCoins(deal, deal.buyer._id, deal.seller._id, deal.sum.toString(), deal.coin);
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'system';
                            data.text = 'Deal completed. Money released from deposit to seller';
                            let message = {
                                sender: client.decoded_token._id,
                                text: data.text,
                                deal: deal._id,
                                type: data.type
                            };
                            deal.status = 'completed';
                            new Message(message).save((err, message) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve({deal: deal, message: message});
                            });

                        } else {
                            reject({});
                        }
                    });
                })
                .then(data => {
                    data.deal.messages.push(data.message._id);
                    return data.deal.save();
                })
                .then(deal => {
                    io.in(deal._id.toString()).emit('dealCompleted', data);

                    let user = deal.buyer._id.toString() == client.decoded_token._id.toString() ? deal.seller._id : deal.buyer._id;

                    const notification = {
                        sender: client.decoded_token._id,
                        user: user,
                        deal: deal._id,
                        type: 'dealCompleted',
                        text: 'Deal completed',
                    };

                    return new Notification(notification).save();
                })
                .then(notification => {
                    Notification
                        .findById(notification._id)
                        .populate('deal')
                        .populate('sender', 'username')
                        .then(notification => {
                            const clients = io.clients[notification.user];
                            if (clients) {
                                for (let client of clients) {
                                    io.to(client).emit('notification', notification);
                                }
                            }
                        });
                })
                .catch(err => {
                    client.emit('errorOccured');
                    console.log(err);
                });
        });

        // start dispute    
        client.on('call_escrow', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise((resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'accepted') {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role) {
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'system';
                            data.text = data.sender.username+' ('+role+') opened the dispute. Please wait for escrows decision';
                            let message = {
                                sender: client.decoded_token._id,
                                text: data.text,
                                deal: deal._id,
                                type: data.type
                            };
                            deal.status = 'dispute';
                            new Message(message).save((err, message) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve({deal: deal, message: message});
                            });

                        } else {
                            reject({});
                        }
                    });
                })
                .then(data => {
                    return new Promise((resolve, reject) => {
                        findEscrows(data.deal).then(escrows => {
                            data.escrows = escrows;
                            resolve(data);
                        }, err => {
                            reject(err);
                        })
                    });
                })
                .then(data => {
                    data.deal.messages.push(data.message._id);
                    if (data.escrows.length > 0) {
                        let random = Math.floor(Math.random() * data.escrows.length);
                        data.deal.escrows.push({escrow: data.escrows[random]._id});
                    }
                    return data.deal.save();
                })
                .then(deal => {
                    io.in(deal._id.toString()).emit('disputeOpened', data);
                })
                .catch(err => {
                    console.log(err);
                });
        });

        client.on('choose_dispute_side', data => {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(deal => {
                    return new Promise(async (resolve, reject) => {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'dispute') {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role === 'escrow') {
                            if (deal.escrows[deal.escrows.length - 1].escrow.toString() !== client.decoded_token._id || deal.escrows[deal.escrows.length - 1].decision) {
                                reject({});
                            }
                            deal.escrows.id(deal.escrows[deal.escrows.length - 1]._id).set({decision: data.decision});
                            let decision = checkDispute(deal.escrows);
                            if (decision) { // dispute resolved
                                if (decision === 'seller') {
                                    sendCoins(deal, deal.buyer._id, deal.seller._id, deal.sum.toString(), deal.coin);
                                } else {
                                    let user = await User.findById(deal.buyer._id);
                                    user.holds[deal.coin.toLowerCase()] -= deal.sum;
                                    await user.save();
                                }

                                deal.disputeDecision = decision;
                                deal.status = 'completed';
                                let message = {
                                    text: 'Dispute resolved. Decision: '+decision+' win. Money released from deposit to '+decision,
                                    deal: deal._id,
                                    type: 'system'
                                };
                                new Message(message).save((err, message) => {
                                    if (err) {
                                        reject(err);
                                    }
                                    resolve({deal: deal, message: message});
                                });
                            } else { // dispute continue. need find next guarantor
                                resolve({deal: deal});
                            }
                        } else {
                            reject({});
                        }
                    });
                })
                .then(data => {
                    return new Promise((resolve, reject) => {
                        if (data.message) {
                            resolve(data);
                        }
                        findEscrows(data.deal).then(escrows => {
                            data.escrows = escrows;
                            resolve(data);
                        }, err => {
                            reject(err);
                        })
                    });
                })
                .then(data => {
                    if (data.message) {
                        data.deal.messages.push(data.message._id);
                    }
                    if (data.escrows && data.escrows.length > 0) {
                        let random = Math.floor(Math.random() * data.escrows.length);
                        data.deal.escrows.push({escrow: data.escrows[random]._id});
                    }
                    return data.deal.save();
                })
                .then(deal => {
                    io.in(deal._id.toString()).emit('disputeChanged');
                })
                .catch(err => {
                    console.log(err);
                });
        });

        client.on('logout', () => {
            const logoutClients = clients[client.decoded_token._id];
            for (let id of logoutClients) {
                io.to(id).emit('refresh');
            }
        });

        client.on('disconnect', () => {
            delete clients[client.decoded_token._id];
            User
                .findById(client.decoded_token._id)
                .then(doc => {
                    if (doc) {
                        doc.online.status = false;
                        return doc.save();
                    }
                }).then().catch(err => {console.log('Online status error:', err)});
        });
    });

    return io;
};