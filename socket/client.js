const Deal = require('../db/models/Deal');
const Message = require('../db/models/Message');
const Attachment = require('../db/models/Attachment');
const Notification = require('../db/models/Notification');
const Crypto = require('../db/models/crypto/Crypto');
const User = require('../db/models/User');
const CommissionWallet = require('../db/models/crypto/commissionWallet');
const HistoryTransaction = require('../db/models/HistoryTransaction');

const BigNumber = require('bignumber.js');
const stringLodash = require('lodash/string');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

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
};

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
};

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
};

const distribCommission = async (comSum, db_crypto) => {
    try{
        let comWallet = await CommissionWallet.findOne();

        let comTrust = comSum.dividedBy(100).multipliedBy(80).decimalPlaces(8);

        let comMaintenance = comSum.minus(comTrust);

        comWallet.trust.find(function (element) {
            if (element.name === db_crypto.name.toLowerCase()){
                element.amount = new BigNumber(element.amount).plus(comTrust).toString(10);
                return true;
            }
        });

        comWallet.maintenance.find(function (element) {
            if (element.name === db_crypto.name.toLowerCase()){
                element.amount = new BigNumber(element.amount).plus(comMaintenance).toString(10);
                return true;
            }
        });

        await comWallet.save();
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }

};

const sendCoins = async (deal, from_id, to_id, sum, coin) =>{
    try {
        const from_user = await User.findById(from_id).populate('wallet');
        const to_user = await User.findById(to_id).populate('wallet');

        let db_crypto = await Crypto.findOne({$and: [{name: coin.toUpperCase()}, {active: true}]});

        if (!db_crypto){
            throw {success: false, message: 'Wrong coin ' + coin};
        }
        
        let sumBN = new BigNumber(sum).decimalPlaces(8);
        let comSum = sumBN.dividedBy(100).decimalPlaces(8);


        if (distribCommission(comSum, db_crypto)){
            switch (db_crypto.typeMonet){
                case 'erc20':
                    to_user.total.find(function (element) {
                        if (element.name === db_crypto.name.toLowerCase()){
                            element.amount = new BigNumber(element.amount).plus(sumBN).minus(comSum).toString(10);
                            return true;
                        }
                    });
                    from_user.total.find(function (element) {
                        if (element.name === db_crypto.name.toLowerCase()){
                            element.amount = new BigNumber(element.amount).minus(sumBN).toString(10);
                            return true;
                        }
                    });
                    from_user.holds[coin.toLowerCase()] -= parseFloat(sum);
                    from_user.markModified('holds.'+coin.toLowerCase());

                    await HistoryTransaction.update({owner: to_user._id}, {$push:{ inPlatform:
                                {fromUser: from_user.username, toUser:to_user.username, coinName: db_crypto.name.toLowerCase(), charge: true, amount: sumBN.minus(comSum).toString(10), dId: deal.dId}
                        }});

                    await HistoryTransaction.update({owner: from_user._id}, {$push:{ inPlatform:
                                {fromUser: from_user.username, toUser: to_user.username, coinName: db_crypto.name.toLowerCase(), charge: false, amount: sumBN.toString(10), dId: deal.dId}
                        }});

                    await to_user.save();
                    await from_user.save();



                    return true;
                case 'eth':
                    to_user.total.find(function (element) {
                        if (element.name === db_crypto.name.toLowerCase()){
                            element.amount = new BigNumber(element.amount).plus(sumBN).minus(comSum).toString(10);
                            return true;
                        }
                    });
                    from_user.total.find(function (element) {
                        if (element.name === db_crypto.name.toLowerCase()){
                            element.amount = new BigNumber(element.amount).minus(sumBN).toString(10);
                            return true;
                        }
                    });
                    from_user.holds.eth -= parseFloat(sum);
                    from_user.markModified('holds.eth');
                    await to_user.save();
                    await from_user.save();

                    await HistoryTransaction.update({owner: to_user._id}, {$push:{ inPlatform:
                                {fromUser: from_user.username, toUser:to_user.username, coinName: db_crypto.name.toLowerCase(), charge: true, amount: sumBN.toString(10), dId: deal.dId}
                        }});

                    await HistoryTransaction.update({owner: from_user._id}, {$push:{ inPlatform:
                                {fromUser: from_user.username, toUser:to_user.username, coinName: db_crypto.name.toLowerCase(), charge: false, amount: sumBN.toString(10), dId: deal.dId}
                        }});
                    return true;
            }
        }
    }
    catch (err) {
        console.log(err);
        return false;
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

                const message = {
                    sender: client.decoded_token._id,
                    text: data.text,
                    deal: deal._id,
                    type: data.type
                };

                const buyer = await User.findById(deal.buyer._id).populate('wallet');
                let balance = 0,
                    coin = deal.coin.toLowerCase();

                let notEnoughMoney = false,
                    messages = [message];

                let db_crypto = await Crypto.findOne({$and: [{name: coin.toUpperCase()}, {active: true}]});


                if (typeof db_crypto === undefined || db_crypto.length === 0){
                    throw {success: false, message: 'Wrong coin ' + coin};
                }

                switch (db_crypto.typeMonet) { // check balances
                    case 'erc20':
                        buyer.total.find(function (element) {
                            if (element.name === db_crypto.name.toLowerCase()){
                                if (new BigNumber(element.amount).minus(new BigNumber(buyer.holds[coin])).comparedTo(new BigNumber(deal.sum)) === -1){
                                    notEnoughMoney = true;
                                }
                            }
                        });
                        break;

                    case 'eth':
                        buyer.total.find(function (element) {
                            if (element.name === db_crypto.name.toLowerCase()){
                                if (new BigNumber(element.amount).minus(new BigNumber(buyer.holds[coin])).comparedTo(new BigNumber(deal.sum)) === -1){
                                    notEnoughMoney = true;
                                }
                            }
                        });
                        break;
                }

                switch (role) {
                    case 'seller':
                        deal.acceptedBySeller = true;
                        break;
                    case 'buyer':
                        if (!notEnoughMoney) deal.acceptedByBuyer = true;
                        break;
                }

                if (notEnoughMoney) {
                    if (role === 'buyer') {
                        client.emit('NotEnoughMoney');
                        throw {success: false, message: 'The buyer does not have enough money.'};
                    }

                    if (role === 'seller') {
                        messages.push({
                            deal: message.deal,
                            type: message.type,
                            text: strings('buyer_not_enough_money', 'eng'),
                        });
                        deal.status = 'new';
                        deal.acceptedByBuyer = false;
                    }
                };

                if (deal.acceptedBySeller && deal.acceptedByBuyer && !notEnoughMoney) {
                    deal.status = 'accepted';
                };

                if (deal.status === 'accepted') {
                    buyer.holds[coin] += parseFloat(deal.sum);
                    buyer.markModified('holds.' + coin);
                    await buyer.save();
                        
                    messages.push({
                        deal: message.deal,
                        type: message.type,
                        text: strings('accept_deal_both', 'eng'),
                    });
                }

                messages = await Message.insertMany(messages);
                messages.forEach(item => {
                    deal.messages.push(item);
                });

                await deal.save();

                client.emit('dealConditionsAcceptedWithNotice', data);

                io.in(deal._id.toString()).emit('dealConditionsAccepted', data);


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

    client.on('set_deal_rate', async data => {
        try {

            const deal = await getDealBydId(data.deal_id);

            const role = deal.getUserRole(client.decoded_token._id);
            if (deal && deal.type === 'exchange' && deal.status === 'new' && (/^([0-9]+[.])?[0-9]+$/i.test(data.rate)) && role) {
                data.sender = client.decoded_token;
                data.created_at = new Date();
                data.type = 'system';

                console.log(data.rate, deal.currency);

                switch (role) {
                    case 'seller':
                        deal.acceptedByBuyer = false;
                        break;
                    case 'buyer':
                        deal.acceptedBySeller = false;
                        break;
                }

                //change rate
                deal.rate = data.rate;

                //TODO fix rate notifications
                data.text = strings('deal_rate_changed', 'eng', {rate: deal.rate, currency: deal.currency});

                const message = await new Message({
                    sender: client.decoded_token._id,
                    text: data.text,
                    deal: deal._id,
                    type: data.type
                }).save();

                deal.messages.push(message._id);


                await deal.save();

                io.in(deal._id.toString()).emit('changeDealRate', data);

                const notification = {
                    sender: client.decoded_token._id,
                    user: role === 'seller' ? deal.buyer._id : deal.seller._id,
                    deal: deal._id,
                    type: 'changeDealRate',
                    text: 'New rate:' + deal.rate,
                };

                createAndSendNotification(notification, io);
            }
        } catch (err) {
            console.log('Sockets error (set_deal_rate): ', err)
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
                data.conditions = stringLodash.escape(data.conditions);
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

            if (role === 'buyer' && deal.status !== 'canceled') {
                await sendCoins(deal, deal.buyer._id, deal.seller._id, deal.sum.toString(), deal.coin);

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

    client.on('cancel_Deal', async data =>{
        try{
            const deal = await getDealBydId(data.deal_id);
            const role = deal.getUserRole(client.decoded_token._id);

            if (deal && deal.status === 'new' && role){
                deal.acceptedByBuyer = false;
                deal.acceptedByBuyer = false;
                deal.status = 'canceled';
                await deal.save();

                io.in(deal._id.toString()).emit('dealCanceled', data);

                const user = role === 'seller' ? deal.buyer._id : deal.seller._id;

                const notification = {
                    sender: client.decoded_token._id,
                    user: user,
                    deal: deal._id,
                    type: 'dealCanceled',
                    text: 'The deal was canceled',
                };

                createAndSendNotification(notification, io);
            }
            console.log('socket cancel deal, curr deal status: ' + deal.status);
        }
        catch (err) {
            console.log('Sockets error (cancel_Deal): ', err)
        }
    });
}