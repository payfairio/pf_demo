const Review = require('../db/models/Review.js');
const Deal = require('../db/models/Deal');
const Message = require('../db/models/Message');
const Notification = require('../db/models/Notification');
const User = require('../db/models/User');
const Crypto = require('../db/models/crypto/Crypto');
const CommissionWallet = require('../db/models/crypto/commissionWallet');
const HistoryTransaction = require('../db/models/HistoryTransaction');

const strings = require('../config/strings');
const mongoose = require('mongoose');
const BigNumber = require('bignumber.js');

const namePlatform = 'PayFair';

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

const findEscrows = async deal => {
    try {
        const used_ids = deal.escrows.map(escrow => escrow.escrow);
        return await User.find({$and: [
                    {type: 'escrow'},
                    {_id: {$nin: used_ids}},
                    {statusEscrowBool: true},
                    {"online.status": true}
                ]
        });
    }
    catch (err) {
        console.log(err);
        return [];
    }
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

const distribCommission = async (deal ,comSum, db_crypto, decision) => {
    try {
        let comWallet = await CommissionWallet.findOne();

        let comEscrow = comSum.dividedBy(2);

        let comSumTrustAndMaint = comSum.minus(comEscrow);

        let comTrust = comSumTrustAndMaint.dividedBy(100).multipliedBy(80);

        let comMaintenance = comSumTrustAndMaint.minus(comTrust);


        let cntDecision = 0;
        for (let escrow of deal.escrows){
            if (escrow.decision === decision){
                cntDecision++;
            }
        }

        let payOutToOneEscrow = comEscrow.dividedBy(cntDecision).toFixed(8, 1);

        for (let item of deal.escrows){
            if (item.decision === decision){
                let currEscrow = await User.findOne({_id: item.escrow});

                comEscrow = comEscrow.minus(payOutToOneEscrow);

                currEscrow.total.find(function (element) {
                    if (element.name === deal.coin.toLowerCase()){
                        element.amount = new BigNumber(element.amount).plus(payOutToOneEscrow).toString(10)
                    }
                });

                currEscrow.save();

                await HistoryTransaction.update({owner: currEscrow._id}, {$push:{ inPlatform:
                            {fromUser: namePlatform, toUser: currEscrow.username, coinName: deal.coin.toLowerCase(), charge: true, amount: payOutToOneEscrow.toString(10)}
                }});
            }
        }

        //The remainder
        comTrust = comTrust.plus(comEscrow);

        /*comWallet.escrow.find(function (element) {
            if (element.name === db_crypto.name.toLowerCase()){
                element.amount = new BigNumber(element.amount).plus(comEscrow).toString(10);
                return true;
            }
        });*/

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

const sendCoins = async (deal, from_id, to_id, sum, coin, decision) =>{
     try{
         const from_user = await User.findById(from_id).populate('wallet');
         const to_user = await User.findById(to_id).populate('wallet');

         let db_crypto = await Crypto.findOne({$and: [{name: coin.toUpperCase()}, {active: true}]});

         if (!db_crypto){
             throw {success: false, message: 'Wrong coin ' + coin};
         }

         let sumBN = new BigNumber(sum);
         let comSum = sumBN.dividedBy(100).multipliedBy(3).decimalPlaces(8);

         if (distribCommission(deal ,comSum, db_crypto, decision)){
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
                             element.holds = new BigNumber(element.holds).minus(sum).toString(10);
                             return true;
                         }
                     });


                     await to_user.save();
                     await from_user.save();

                     await HistoryTransaction.update({owner: to_user._id}, {$push:{ inPlatform:
                                 {fromUser: from_user.username, toUser:to_user.username, coinName: db_crypto.name.toLowerCase(), charge: true, amount: sumBN.minus(comSum).toString(10), dId: deal.dId}
                         }});

                     await HistoryTransaction.update({owner: from_user._id}, {$push:{ inPlatform:
                                 {fromUser: from_user.username, toUser:to_user.username, coinName: db_crypto.name.toLowerCase(), charge: false, amount: sumBN.toString(10), dId: deal.dId}
                         }});

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
                             element.holds = new BigNumber(element.holds).minus(sum).toString(10);
                             return true;
                         }
                     });


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

    client.on('call_escrow', async data => {
        try {
            const deal = await getDealBydId(data.deal_id);

            if (deal && deal.status === 'accepted') {

                const role = deal.getUserRole(client.decoded_token._id);
                if (role) {
                    data.sender = client.decoded_token;
                    data.created_at = new Date();
                    data.type = 'system';
                    data.text = strings('call_escrow', 'eng', {username: data.sender.username, role: role});

                    const message = await new Message({
                        sender: client.decoded_token._id,
                        text: data.text,
                        deal: deal._id,
                        type: data.type
                    }).save();

                    deal.status = 'dispute';
                    deal.messages.push(message._id);


                    const escrows = await findEscrows(deal);
                    if (escrows.length > 0) {
                        const random = Math.floor(Math.random() * escrows.length);
                        let pichedID = escrows[random]._id;
                        deal.escrows.push({escrow: pichedID});
                    }
                    await deal.save();
                    io.in(deal._id.toString()).emit('disputeOpened', data);

                    const notification = {
                        user: deal.escrows[deal.escrows.length - 1].escrow,
                        deal: deal._id,
                        type: 'dispute',
                        text: "You need to resolve dispute"
                    };
                    createAndSendNotification(notification, io);
                }
            }
        } catch (err) {
            console.log('Sockets error (call_escrow): ', err)
        }
    });

    client.on('choose_dispute_side', async data => {
        try {
            const deal = await getDealBydId(data.deal_id);
            if (deal && deal.status === 'dispute') {
                const role = deal.getUserRole(client.decoded_token._id);
                if (role === 'escrow') {
                    const last_escrow = deal.escrows[deal.escrows.length - 1];
                    if (last_escrow.escrow.toString() === client.decoded_token._id && !last_escrow.decision) {
                        deal.escrows.id(last_escrow._id).set({decision: data.decision});
                        const decision = checkDispute(deal.escrows);
                        if (decision) {
                            if (decision === 'seller') {
                                await sendCoins(deal, deal.buyer._id, deal.seller._id, deal.sum.toString(), deal.coin, decision);
                            } else {
                                let db_crypto = await Crypto.findOne({$and: [{name: deal.coin.toUpperCase()}, {active: true}]});
                                let user = await User.findById(deal.buyer._id);

                                let sumBN = new BigNumber(deal.sum);
                                let comSum = sumBN.dividedBy(100).multipliedBy(3).decimalPlaces(8);

                                await distribCommission(deal, comSum, db_crypto, decision);

                                user.total.find(function (element) {
                                    if (element.name === db_crypto.name.toLowerCase()){
                                        element.amount = new BigNumber(element.amount).minus(comSum).toString(10);
                                        element.holds = new BigNumber(element.holds).minus(deal.sum).toString(10);
                                        return true;
                                    }
                                });

                                await user.save();
                            }

                            const message = await new Message({
                                text: strings('resolve_dispute', 'eng', {decision: decision}),
                                deal: deal._id,
                                type: 'system'
                            }).save();

                            deal.disputeDecision = decision;
                            deal.status = 'completed';
                            deal.messages.push(message._id);

                            let reviewBySeller = await new Review({
                                _id: new mongoose.Types.ObjectId(),
                                user: deal.buyer._id,
                                author: deal.seller._id,
                                comment: 'Completed with Escrow',
                                deal: deal._id,
                            });
                            let reviewByBuyer = await new Review({
                                _id: new mongoose.Types.ObjectId(),
                                user: deal.seller._id,
                                author: deal.buyer._id,
                                comment: 'Completed with Escrow',
                                deal: deal._id,
                            });
                            await reviewBySeller.save();
                            await reviewByBuyer.save();
                        } else {
                            const escrows = await findEscrows(deal);
                            if (escrows.length > 0) {
                                const random = Math.floor(Math.random() * escrows.length);
                                deal.escrows.push({escrow: escrows[random]._id});
                            }
                        }
                        await deal.save();
                        io.in(deal._id.toString()).emit('disputeChanged')

                        const notification = {
                            user: deal.escrows[deal.escrows.length - 1],
                            deal: deal._id,
                            type: 'dispute',
                            text: "You need to resolve dispute"
                        };
                        createAndSendNotification(notification, io);
                    }
                }
            }
        } catch (err) {
            console.log('Sockets error (choose_dispute_side): ', err)
        }
    });
}