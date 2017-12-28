const socketioJwt = require('socketio-jwt');
const config = require('./config/database');

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
function findEscrows(deal) {
    let used_ids = deal.escrows.map(function (escrow) {
        return escrow.escrow;
    });
    return User.find({$and: [{type: 'escrow'}, {_id: {$nin: used_ids}}]});
}
async function sendCoins(deal, from_id, to_id, sum, coin) { // todo: error handling
    const from_user = await User.findById(from_id).populate('wallet');
    const to_user = await User.findById(to_id).populate('wallet');
    let count = 0;
    let txData = null;
    let receipt = null;
    switch (coin.toLowerCase()) {
        case 'pfr':
            amount = sum * Math.pow(10, 8);
            const contract = new web3.eth.Contract(require('./abi/Token.json'), config_crypto.pfr_address);
            // transfer
            count = await web3.eth.getTransactionCount(from_user.wallet.address);
            // I chose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!
            /*let gasLimit = await web3.eth.estimateGas({
             nonce: count,
             to: config_crypto.pfr_address,
             data: contract.methods.transfer(toAddress, amount).encodeABI()
             });*/
            txData = await web3.eth.accounts.signTransaction({
                to: config_crypto.pfr_address,
                gas: 110000,//gasLimit,
                gasPrice: await web3.eth.getGasPrice(),
                data: contract.methods.transfer(to_user.wallet.address, amount).encodeABI(),
                nonce: count
            }, from_user.wallet.privateKey);
            receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
            from_user.holds.pfr -= parseFloat(sum);
            from_user.markModified('holds.pfr');
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
}
function checkDispute(decisions) {
    if (decisions.length < 3) {
        return null;
    }
    var prev = null;
    var count = 0;
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
}

module.exports = function(server, app) {
    const io = require('socket.io')(server);

    const clients = {};
    app.io = io;
    io.clients = clients;
    
    io.on('connection', socketioJwt.authorize({
        secret: config.secret,
    })).on('authenticated', function(client) {
        client.emit('authorized');

        if (!clients[client.decoded_token._id]) {
            clients[client.decoded_token._id] = [];
        }
        clients[client.decoded_token._id].push(client.id);

        User
            .findById(client.decoded_token._id)
            .then(function (doc) {
                if (doc) {
                    doc.online.status = true;
                    doc.online.lastConnect = new Date();
                    return doc.save();
                }
            }).then().catch(function (err) {console.log('Online status error:', err)});

        // attachments in chats
        require('./socket/uploads')(client);
        
        client.on('join_chat', function (data) {
            Deal.findOne({dId: data.deal_id}).populate({path: 'messages', populate: [{path: 'sender', select: ['-password', '-wallet']}, {path: 'attachments'}]})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    if (!deal) {
                        return;
                    }
                    let role = deal.getUserRole(client.decoded_token._id);
                    if (role) {
                        if (role === 'escrow') {
                            let escIndex = 0;
                            deal.escrows.forEach(function (esc, index) {
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
                            });

                            //need to set 'join_at' value to escrow
                            deal.escrows[escIndex].join_at = new Date();
                            deal.save().then().catch(function(err){console.log(err)});
                        } else {
                            if (deal.status == 'completed'){
                                Review.find({deal: deal._id, author: client.decoded_token._id}).then(function (doc){
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
                    }
                }).catch(function (err) {
                    console.log(err);
                });
        });

        client.on('leave_chat', function (data) {
            client.leave(data.deal_id);
        });

        client.on('message', function(data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
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
                                attachments: data.attachments.map(function (item) {return item._id})
                            };
                            new Message(message).save(function (err, message) {
                                if (err) {
                                    reject(err);
                                }
                                Attachment.update({_id: {$in: data.attachments.map(function (item) {return item._id})}}, {$set: {message: message._id}}, function () {
                                    resolve({role: role, deal: deal, message: message});
                                });
                            });

                        } else {
                            reject({});
                        }
                    });

                })
                .then(function (data) {
                    const role = data.role;
                    const deal = data.deal;
                    const sender = role === 'buyer' ? deal.buyer._id : deal.seller._id;
                    const user = role === 'seller' ? deal.buyer._id : deal.seller._id;
                    
                    const notification = {
                        sender: sender,
                        user: user,
                        deal: deal._id,
                        type: 'message',
                        text: data.message.text,
                    };

                    data.deal.messages.push(data.message._id);
                    data.deal.save();

                    return new Notification(notification).save();
                })
                .then(function (notification) {
                    io.in(notification.deal.toString()).emit('message', data);

                    Notification.findById(notification._id)
                        .populate('deal')
                        .then(notification => {
                            const clients = io.clients[notification.user];
                            if (clients) {
                                for (let client of clients) {
                                    io.to(client).emit('notification', notification);
                                    notification.viewed = true;
                                }
                            }
                        });
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('accept_deal_condition', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
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
                                new Message(message).save(function (err, message) {
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
                                Message.insertMany(messages).then(function (messages) {
                                    resolve({deal: deal, messages: messages, role: role});
                                }, function (err) {
                                    reject(err);
                                });
                            }
                        } else {
                            reject({});
                        }
                    });
                })
                .then(function (data){
                    return new Promise(function(resolve, reject){
                        if (data.role && data.role == 'buyer'){
                            User.findById(client.decoded_token._id).populate('wallet').then(async function (user) {
                                let balance = 0;
                                switch (data.deal.coin.toLowerCase()) {
                                    case 'pfr':
                                        const contract = new web3.eth.Contract(require('./abi/Token.json'), require('./config/crypto').pfr_address);
                                        balance = await contract.methods.balanceOf(user.wallet.address).call();
                                        if (balance - user.holds.pfr * Math.pow(10, 8) < data.deal.sum * Math.pow(10, 8)) {
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
                            .then(function (user){
                                resolve(data);
                            })
                            .catch(function (err){
                                reject(err);
                            });
                        } else {
                            resolve(data);
                        }
                    });
                })
                .then(function (data) {
                    if (data.message) {
                        data.deal.messages.push(data.message._id);
                    } else if (data.messages) {
                        data.messages.forEach(function (item) {
                            data.deal.messages.push(item);
                        });
                    }
                    return data.deal.save();
                })
                .then(function (deal) {
                    io.in(deal._id.toString()).emit('dealConditionsAccepted', data);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('set_deal_sum', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
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
                            new Message(message).save(function (err, message) {
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
                .then(function (data) {
                    data.deal.messages.push(data.message._id);
                    return data.deal.save();
                })
                .then(function (deal) {
                    io.in(deal._id.toString()).emit('changeDealSum', data);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('set_deal_condition', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
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
                            new Message(message).save(function (err, message) {
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
                .then(function (data) {
                    data.deal.messages.push(data.message._id);
                    return data.deal.save();
                })
                .then(function (deal) {
                    io.in(deal._id.toString()).emit('changeDealConditions', data);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('accept_deal', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(async function (resolve, reject) {
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
                            new Message(message).save(function (err, message) {
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
                .then(function (data) {
                    data.deal.messages.push(data.message._id);
                    return data.deal.save();
                })
                .then(function (deal) {
                    io.in(deal._id.toString()).emit('dealCompleted', data);
                })
                .catch(function (err) {
                    client.emit('errorOccured');
                    console.log(err);
                });
        });

        // start dispute    
        client.on('call_escrow', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
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
                            new Message(message).save(function (err, message) {
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
                .then(function (data) {
                    return new Promise(function (resolve, reject) {
                        findEscrows(data.deal).then(function (escrows) {
                            data.escrows = escrows;
                            resolve(data);
                        }, function (err) {
                            reject(err);
                        })
                    });
                })
                .then(function (data) {
                    data.deal.messages.push(data.message._id);
                    if (data.escrows.length > 0) {
                        let random = Math.floor(Math.random() * data.escrows.length);
                        data.deal.escrows.push({escrow: data.escrows[random]._id});
                    }
                    return data.deal.save();
                })
                .then(function (deal) {
                    io.in(deal._id.toString()).emit('disputeOpened', data);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('choose_dispute_side', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: ['-password', '-wallet']})
                .populate({path: 'buyer', select: ['-password', '-wallet']})
                .then(function (deal) {
                    return new Promise(async function (resolve, reject) {
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
                                new Message(message).save(function (err, message) {
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
                .then(function (data) {
                    return new Promise(function (resolve, reject) {
                        if (data.message) {
                            resolve(data);
                        }
                        findEscrows(data.deal).then(function (escrows) {
                            data.escrows = escrows;
                            resolve(data);
                        }, function (err) {
                            reject(err);
                        })
                    });
                })
                .then(function (data) {
                    if (data.message) {
                        data.deal.messages.push(data.message._id);
                    }
                    if (data.escrows && data.escrows.length > 0) {
                        let random = Math.floor(Math.random() * data.escrows.length);
                        data.deal.escrows.push({escrow: data.escrows[random]._id});
                    }
                    return data.deal.save();
                })
                .then(function (deal) {
                    io.in(deal._id.toString()).emit('disputeChanged');
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('logout', function () {
            const logoutClients = clients[client.decoded_token._id];
            for (let id of logoutClients) {
                io.to(id).emit('refresh');
            }
        });

        client.on('disconnect', function () {
            delete clients[client.decoded_token._id];
            User
                .findById(client.decoded_token._id)
                .then(function (doc) {
                    if (doc) {
                        doc.online.status = false;
                        return doc.save();
                    }
                }).then().catch(function (err) {console.log('Online status error:', err)});
        });
    });

    return io;
};