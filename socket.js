const socketioJwt = require('socketio-jwt');
const config = require('./config/database');

const User = require('./db/models/User.js');
const Deal = require('./db/models/Deal.js');
const Message = require('./db/models/Message.js');

// on client first call and on decision of prev escrow
function findEscrows(deal) {
    let used_ids = deal.escrows.map(function (escrow) {
        return escrow.escrow;
    });
    return User.find({$and: [{type: 'escrow'}, {_id: {$nin: used_ids}}]});
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

module.exports = function(server) {
    const io = require('socket.io')(server);
    var clients = {};
    io.on('connection', socketioJwt.authorize({
        secret: config.secret,
    })).on('authenticated', function(client) {
        if (!clients[client.decoded_token._id]) {
            clients[client.decoded_token._id] = [];
        }
        clients[client.decoded_token._id].push(client.id);

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
                        if (role === 'escrow') {
                            let escIndex = 0;
                            deal.escrows.forEach(function (esc, index) {
                                if (esc.escrow === client.decoded_token._id) {
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
                        } else {
                            client.emit('initMessages', {
                                deal: deal,
                                messages: deal.messages,
                                counterparty: (role === 'seller' ? deal.buyer : deal.seller)
                            });
                        }
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
                                type: data.type
                            };
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
                    io.in(deal._id.toString()).emit('message', data);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        client.on('accept_deal_condition', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
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
                                    resolve({deal: deal, message: message});
                                });
                            } else {
                                // deal accepted
                                let messages = [message];
                                messages.push({
                                    deal: message.deal,
                                    type: message.type,
                                    text: 'Terms, conditions and sum of deal were accepted by both parties. Deal sum is transferred to a smartcontract until the end of the trade.',
                                });
                                Message.insertMany(messages).then(function (messages) {
                                    resolve({deal: deal, messages: messages});
                                }, function (err) {
                                    reject(err);
                                });
                            }
                        } else {
                            reject({});
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
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
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
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
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
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
                        if (!deal) {
                            reject({});
                        }
                        if (deal.status !== 'accepted') {
                            reject({});
                        }
                        let role = deal.getUserRole(client.decoded_token._id);
                        if (role === 'buyer') { // only buyer can accept deal without escrows
                            data.sender = client.decoded_token;
                            data.created_at = new Date();
                            data.type = 'system';
                            data.text = 'Deal completed. Money released from smartcontract to seller';
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
                    console.log(err);
                });
        });

        // start dispute
        client.on('call_escrow', function (data) {
            Deal.findOne({dId: data.deal_id})
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
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
                .populate({path: 'seller', select: '-password'})
                .populate({path: 'buyer', select: '-password'})
                .then(function (deal) {
                    return new Promise(function (resolve, reject) {
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
                                deal.disputeDecision = decision;
                                deal.status = 'completed';
                                let message = {
                                    text: 'Dispute resolved. Decision: '+decision+' win. Money released from smartcontract to '+decision,
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
        });
    });
};