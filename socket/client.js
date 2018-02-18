const Deal = require('../db/models/Deal');
const Message = require('../db/models/Message');
const Attachment = require('../db/models/Attachment');
const Notification = require('../db/models/Notification');
const User = require('../db/models/User');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);
const config_crypto = require('../config/crypto');
const strings = require('../config/strings');

const checkUserInRoom = (clients, room) => {
    for (let client of clients) {
        if (room[client]) {
            return true;
        }
    }
    return false;
};

const getUsersFromRoom = (clients, room) => {
    let result = [];
    for (let client in room) {
        for (let c in clients) {
            if (clients[c].indexOf(client) != -1 && result.indexOf(c) == -1) {
                result.push(c);
            }
        }
    }
    return result;
}

const createAndSendNotification = async (notification, io) => {
    notification = await new Notification(notification).save(); // create notification
    notification = await Notification // get notification with populate deal and sender
        .findById(notification._id)
        .populate('deal')
        .populate('sender', 'username');

    const clients = io.clients[notification.user];
    if (clients) {
        for (let client of clients) {
            io.to(client).emit('notification', notification); // send notification to all clients (tabs)
        }
    }
}

const getDealBydId = (dId) => {
    return Deal
        .findOne({dId: dId})
        .populate({
            path: 'seller',
            select: ['-password', '-wallet', '-verifyCode', '-changePwdCode']
        })
        .populate({
            path: 'buyer',
            select: ['-password', '-wallet', '-verifyCode', '-changePwdCode']
        });
}

const sendCoins = async (deal, from_id, to_id, sum, coin) => { // todo: error handling
    const from_user = await User.findById(from_id).populate('wallet');
    const to_user = await User.findById(to_id).populate('wallet');
    let count = 0;
    let txData = null;
    let receipt = null;
    switch (config_crypto[coin.toLowerCase()].type) {
        case 'erc20':
            amount = sum * Math.pow(10, config_crypto[coin.toLowerCase()].decimals);
            const contract = new web3.eth.Contract(require('../abi/'+coin.toLowerCase()+'/Token.json'), config_crypto[coin.toLowerCase()].address);
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

module.exports = (client, io) => {
    const clients = io.clients;

    client.on('message', async data => {
        try {
            let deal = await getDealBydId(data.deal_id);
        
            let role = deal.getUserRole(client.decoded_token._id); // get user role in deal
            if (deal && role) {
                let sender = client.decoded_token._id,
                    created_at = new Date(),
                    type = 'message',
                    user = role === 'seller' ? deal.buyer._id : deal.seller._id, // who get message
                    roomClients = io.sockets.adapter.rooms[deal._id].sockets,
                    lastEscrow = deal.escrows.length > 0 ? deal.escrows[deal.escrows.length - 1] : null;

                let message = await new Message({ // create message
                    sender: sender,
                    text: data.text,
                    deal: deal._id,
                    type: type,
                    attachments: data.attachments.map(item => item._id),
                    viewed: getUsersFromRoom(clients, roomClients)
                }).save();

                await Attachment.update({ _id: { $in: data.attachments.map(item => item._id) } }, { $set: { message: message._id } });

                deal.messages.push(message);
                await deal.save();

                /* Send notification to counterparty */
                if (!clients[user] || !checkUserInRoom(clients[user], roomClients)) {
                    let notification = {
                        sender: sender,
                        user: user,
                        deal: deal._id,
                        type: 'message',
                        text: data.text,
                    };
                    createAndSendNotification(notification, io);
                }

                /* Send notification to last escrow */
                if (lastEscrow && !lastEscrow.decision && (!clients[lastEscrow.escrow] || !checkUserInRoom(clients[lastEscrow.escrow], roomClients))) {
                    notification = {
                        sender: sender,
                        user: lastEscrow.escrow,
                        deal: deal._id,
                        type: 'message',
                        text: data.text
                    };
                    createAndSendNotification(notification, io);
                }

                data.sender = client.decoded_token;
                data.created_at = created_at;
                data.type = type;
                io.in(deal._id.toString()).emit('message', data);
            }
        } catch (err) {
            console.log('Sockets error (message): ', err);
        }
    });

    client.on('accept_deal_condition', async data => {
        try {
            const deal = await getDealBydId(data.deal_id);

            const role = deal.getUserRole(client.decoded_token._id);
            if (deal && deal.status === 'new' && role) {
                data.sender = client.decoded_token;
                data.created_at = new Date();
                data.type = 'system';
                data.text = strings('accept_deal_condition', 'eng');

                switch (role) {
                    case 'seller':
                        deal.acceptedBySeller = true;
                        break;
                    case 'buyer':
                        deal.acceptedByBuyer = true;
                        break;
                }

                const message = {
                    sender: client.decoded_token._id,
                    text: data.text,
                    deal: deal._id,
                    type: data.type
                };

                if (deal.acceptedBySeller && deal.acceptedByBuyer) {
                    deal.status = 'accepted';
                }
                let notEnoughMoney = false,
                    messages = [message];

                if (deal.status === 'accepted') {
                    const buyer = await User.findById(deal.buyer._id).populate('wallet');
                    let balance = 0,
                        coin = deal.coin.toLowerCase();

                    if (!config_crypto.hasOwnProperty(coin)) {
                        throw {succes: false, message: 'Wrong coin ' + coin}
                    }
                    switch (config_crypto[coin].type) { // check balances
                        case 'erc20':
                            const contract = new web3.eth.Contract(require('../abi/' + coin + '/Token.json'), config_crypto[coin].address);
                            balance = await contract.methods.balanceOf(buyer.wallet.address).call();
                            const e = Math.pow(10, config_crypto[coin].decimals);
                            if (balance - buyer.holds[coin] * e < deal.sum * e) {
                                notEnoughMoney = true;
                            }
                            break;

                        case 'eth':
                            balance = await web3.eth.getBalance(buyer.wallet.address);
                            if (balance - web3.utils.toWei(buyer.holds.eth.toString(), 'ether') < web3.utils.toWei(deal.sum.toString(), 'ether') ) {
                                notEnoughMoney = true;
                            }
                            break;
                    }

                    if (notEnoughMoney) {
                        if (role === 'buyer') {
                            client.emit('NotEnoughMoney');
                            throw {};
                        } else {
                            messages.push({
                                deal: message.deal,
                                type: message.type,
                                text: strings('buyer_not_enough_money', 'eng'),
                            });
                            deal.status = 'new';
                            deal.acceptedByBuyer = false;
                        }
                    } else {
                        buyer.holds[coin] += parseFloat(deal.sum);
                        buyer.markModified('holds.' + coin);
                        await buyer.save();
                        
                        messages.push({
                            deal: message.deal,
                            type: message.type,
                            text: strings('accept_deal_both', 'eng'),
                        });
                    }
                }
                messages = await Message.insertMany(messages);
                messages.forEach(item => {
                    deal.messages.push(item);
                });
                await deal.save();

                io.in(deal._id.toString()).emit('dealConditionsAccepted', data);

                if (notEnoughMoney) {
                    throw {};
                }

                const user = role === 'seller' ? deal.buyer._id : deal.seller._id;

                const notification = {
                    sender: client.decoded_token._id,
                    user: user,
                    deal: deal._id,
                    type: 'dealConditionsAccepted',
                    text: 'conditions accepted',
                };

                createAndSendNotification(notification, io);
            }
        } catch (err) {
            console.log('Sockets error (accept_deal_condition): ', err);
        }
    });

    client.on('set_deal_sum', async data => {
        try {
            const deal = await getDealBydId(data.deal_id);

            const role = deal.getUserRole(client.decoded_token._id);
            if (deal && deal.status === 'new' && (/^([0-9]+[.])?[0-9]+$/i.test(data.sum)) && role) {
                data.sender = client.decoded_token;
                data.created_at = new Date();
                data.type = 'system';
                data.text = strings('deal_sum_changed', 'eng', {sum: data.sum, coin: deal.coin.toUpperCase()});
                switch (role) {
                    case 'seller':
                        deal.acceptedByBuyer = false;
                        break;
                    case 'buyer':
                        deal.acceptedBySeller = false;
                        break;
                }
                const message = await new Message({
                    sender: client.decoded_token._id,
                    text: data.text,
                    deal: deal._id,
                    type: data.type
                }).save();

                deal.messages.push(message._id);
                deal.sum = data.sum;
                await deal.save();

                io.in(deal._id.toString()).emit('changeDealSum', data);

                const notification = {
                    sender: client.decoded_token._id,
                    user: role === 'seller' ? deal.buyer._id : deal.seller._id,
                    deal: deal._id,
                    type: 'changeDealSum',
                    text: 'New sum:' + deal.sum,
                };

                createAndSendNotification(notification, io);
            }
        } catch (err) {
            console.log('Sockets error (set_deal_sum): ', err)
        }
        
    });

    client.on('set_deal_condition', async data => {
        try {
            const deal = await getDealBydId(data.deal_id);

            const role = deal.getUserRole(client.decoded_token._id);
            if (deal && deal.status === 'new' && role) {
                data.sender = client.decoded_token;
                data.created_at = new Date();
                data.type = 'system';
                data.text = strings('set_deal_condition', 'eng', {conditions: data.conditions});
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
                const message = await new Message({
                    sender: client.decoded_token._id,
                    text: data.text,
                    deal: deal._id,
                    type: data.type
                }).save();

                deal.messages.push(message._id);
                await deal.save();

                io.in(deal._id.toString()).emit('changeDealConditions', data);

                const notification = {
                    sender: client.decoded_token._id,
                    user: role === 'seller' ? deal.buyer._id : deal.seller._id,
                    deal: deal._id,
                    type: 'changeDealConditions',
                    text: data.conditions,
                };
                
                createAndSendNotification(notification, io);
            }
        } catch (err) {
            console.log('Sockets error (set_deal_condition): ', err)
        }
    });

    client.on('accept_deal', async data => {
        try {
            const deal = await getDealBydId(data.deal_id);
            const role = deal.getUserRole(client.decoded_token._id);

            if (role === 'buyer') {
                sendCoins(deal, deal.buyer._id, deal.seller._id, deal.sum.toString(), deal.coin);
                data.sender = client.decoded_token;
                data.created_at = new Date();
                data.type = 'system';
                data.text = strings('accept_deal', 'eng');

                const message = await new Message({
                    sender: client.decoded_token._id,
                    text: data.text,
                    deal: deal._id,
                    type: data.type
                }).save();

                deal.status = 'completed';
                deal.messages.push(message._id);
                await deal.save();

                const notification = {
                    sender: client.decoded_token._id,
                    user: role === 'seller' ? deal.buyer._id : deal.seller._id,
                    deal: deal._id,
                    type: 'dealCompleted',
                    text: 'Deal completed',
                };

                io.in(deal._id.toString()).emit('dealCompleted', data);

                createAndSendNotification(notification, io);
            }
        } catch (err) {
            client.emit('errorOccured');
            console.log('Sockets error (accept_deal): ', err)
        }
    });
}