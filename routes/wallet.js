const express = require('express');
const router = express.Router();
const path = require('path');

const CWallet = require('../db/models/ConfirmingWallet');

const User = require('../db/models/User.js');
const Crypto = require('../db/models/crypto/Crypto');
const Price = require('../db/models/Price');
const HistoryTransaction = require('../db/models/HistoryTransaction');

const mainWallet = require('../config/mainWallet');

const passport = require('passport');
const BigNumber = require('bignumber.js');


require('../config/passport')(passport);
const jwt = require('jsonwebtoken');

async function createTrustWallet(data) {
    return new CWallet(data).save();
}

module.exports = web3 => {

    router.post('/removeSignWallet', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            if (req.user.type !== 'trust'){
                return res.status(403).json({
                    success: false,
                    error: 'forbidden'
                });
            }

            if (!req.body.trustWallet){
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request'
                });
            }

            let removedWallet = req.body.trustWallet;

            await User.update({_id: req.user._id}, {$pull: {trustWallet: removedWallet._id}});

            await CWallet.remove({$and:[{owner: req.user._id}, {address: removedWallet.address}]});

            let wallets = await CWallet.find({owner: req.user._id});
            console.log(wallets);

            return res.json({success: true, trustWallet: wallets});
        }
        catch (err){
            console.log(err);
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });

    router.post('/withdraw', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            const toAddress = req.body.address;

            if (!web3.utils.isAddress(toAddress)){
                return res.status(400).json({success: false, error: 'Wrong address'});
            }

            if (req.body.amount.toString() === '')
                return res.status(400).json({success: false, error: 'The value of the sum is not correct'});

            const amount = new BigNumber(req.body.amount).decimalPlaces(8);
            if (!BigNumber.isBigNumber(amount) || amount.isNaN()){
                return res.status(400).json({success: false, error: 'The value of the sum is not correct'});
            }

            const coin = await Crypto.findOne({$and: [{name: req.body.currency.toUpperCase()}, {active: true}]});
            const user = await User.findById(req.user._id).populate('wallet');

            let coinDecimal_Wei = null;
            if (coin.typeMonet === 'erc20')
                coinDecimal_Wei = new BigNumber('10').pow(coin.decimals);

            let gasPrise = await web3.eth.getGasPrice();

            let receipt = null;
            let amountCoinUserInDB = new BigNumber('-1');
            let amountCoinUserHoldInDB = new BigNumber(Infinity);
            let amountEthInUserDB_wei = new BigNumber('-1');

            let minimumTransactionErc20 = new BigNumber('0');

            user.total.find(function (element) {
                if (element.name === 'eth')
                {
                    amountEthInUserDB_wei = new BigNumber(web3.utils.toWei((element.amount), 'ether'));
                    return true;
                }
            });

            if (!coin || coin === undefined) return res.status(400).json({
                success: false,
                error: 'Coin not found'
            });
            switch (coin.typeMonet) {
                case 'erc20':

                    //set minimum sum transaction erc20
                    minimumTransactionErc20 = new BigNumber('99');
                    if (amount.comparedTo(minimumTransactionErc20) === -1)
                        return res.status(400).json({success: false, error: 'amount < minimum transfer limit'});

                    const contract = new web3.eth.Contract(require('../abi/'+coin.name.toLowerCase()+'/Token.json'), coin.address);

                    let amountCoinInMainWallet = new BigNumber(await contract.methods.balanceOf(mainWallet.mWallet.address).call()).dividedBy(coinDecimal_Wei);

                    if (amount.comparedTo(amountCoinInMainWallet) === 1)
                        return res.status(400).json({success: false, error: 'coin in main wallet < amount'});

                    user.total.find(function (element) {
                        if (element.name === coin.name.toLowerCase())
                        {
                            amountCoinUserInDB = new BigNumber(element.amount);
                            amountCoinUserHoldInDB = new BigNumber(element.holds);
                            return true;
                        }
                    });
                    if (amountCoinUserInDB.minus(amountCoinUserHoldInDB).comparedTo(amount) === 1){

                        let contractData = await contract.methods.transfer(toAddress, amount.multipliedBy(coinDecimal_Wei).toString(10));
                        let coefReserveGas = new BigNumber('1.5', 10); // reserve gas for transfer coin  x1.5
                        let amountGasForTransaction_token = new BigNumber(await contractData.estimateGas({from: mainWallet.mWallet.address})).multipliedBy(coefReserveGas);
                        let amountEthForTransaction_token = amountGasForTransaction_token.multipliedBy(gasPrise);

                        if (amountEthInUserDB_wei.comparedTo(amountEthForTransaction_token) === -1)
                            return res.status(400).json({success: false, error: 'There is not enough ether for translation'});


                        let txDataErc20 = await web3.eth.accounts.signTransaction({
                            to: coin.address,
                            gas: amountGasForTransaction_token.toString(10),
                            gasPrice: gasPrise,
                            data: contractData.encodeABI(),
                        }, mainWallet.mWallet.privateKey);

                        //save user
                        user.total.find(function (element) {
                            if (element.name === coin.name.toLowerCase()){
                                element.amount = new BigNumber(element.amount).minus(amount).toString(10);
                                return true;
                            }
                        });
                        user.total.find(function (element) {
                            if (element.name === 'eth'){
                                let amountEthForTransfer_token_fromWei = new BigNumber(web3.utils.fromWei(amountEthForTransaction_token.toString(10), 'ether'));
                                element.amount = new BigNumber(element.amount).minus(amountEthForTransfer_token_fromWei);
                                return true;
                            }
                        });

                        await user.save();

                        await HistoryTransaction.update({owner: user._id}, {$push:{outsidePlatform:
                                    {coinName: coin.name.toLowerCase(), charge: false, amount: amount.toString(10), address: toAddress}
                            }});

                        receipt = await web3.eth.sendSignedTransaction(txDataErc20.rawTransaction);
                        //console.log(receipt.transactionHash);



                        //res success
                        if (receipt.transactionHash){
                            //return success
                            return res.json({success: true});
                        }
                        else {
                            return res.status(400).json({success: false, error: 'The transaction could not be completed.'});
                        }
                    }
                    else {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough coin'
                        });
                    }

                    break;

                case 'eth':
                    //set minimum sum transaction eth
                    minimumTransactionErc20 = new BigNumber('0.000099');
                    if (amount.comparedTo(minimumTransactionErc20) === -1)
                        return res.status(400).json({success: false, error: 'amount < minimum transfer limit'});

                    let amount_wei = new BigNumber(web3.utils.toWei(amount.toString(10), 'ether'));

                    let amountEthInMainWallet = await web3.eth.getBalance(mainWallet.mWallet.address);
                    if (amount_wei.comparedTo(amountEthInMainWallet) === 1)
                        return res.status(400).json({success: false, error: 'coin in main wallet < amount'});

                    user.total.find(function (element) {
                        if (element.name === coin.name.toLowerCase())
                        {
                            amountCoinUserInDB = new BigNumber(web3.utils.toWei(element.amount, 'ether'));
                            amountCoinUserHoldInDB = new BigNumber(web3.utils.toWei(element.holds, 'ether'));
                            return true;
                        }
                    });

                    let amountGasForTransaction_eth = new BigNumber(await web3.eth.estimateGas({to: toAddress, value: amount_wei}));
                    let amountEthForTransaction_eth = amountGasForTransaction_eth.multipliedBy(gasPrise);

                    if (amountCoinUserInDB.minus(amountEthForTransaction_eth).minus(amountCoinUserHoldInDB).comparedTo(amount_wei) === 1){

                        let txData = await web3.eth.accounts.signTransaction({
                            to: toAddress,
                            gas: amountGasForTransaction_eth,
                            gasPrice: gasPrise,
                            value: amount_wei,
                        }, mainWallet.mWallet.privateKey);

                        user.total.find(function (element) {
                            if (element.name === coin.name.toLowerCase()){
                                element.amount = web3.utils.fromWei(amountCoinUserInDB.minus(amountEthForTransaction_eth).minus(amount_wei).toString(10), 'ether');
                                return true;
                            }
                        });

                        await user.save();

                        await HistoryTransaction.update({owner: user._id}, {$push:{outsidePlatform:
                                    {coinName: 'eth', charge: false, amount: web3.utils.fromWei(amount_wei.toString(10), 'ether'), address: toAddress}
                        }});

                        receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
                        //console.log(receipt.transactionHash);

                        //save user




                        //res success
                        if (receipt.transactionHash){
                            //return success
                            return res.json({success: true});
                        }
                        else {
                            return res.status(400).json({success: false, error: 'The transaction could not be completed.'});
                        }
                    }
                    else {
                        return res.status(400).json({
                            success: false,
                            error: 'Translation operation failed'
                        });
                    }

                default:
                    console.log('undefined type monet');

                    return res.status(400).json({
                        success: false,
                        error: 'Undefined type monet'
                    });
            }
        }
        catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });

    router.post('/checkWallet', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            let user = await User.findOne({username: req.user.username}).populate('trustWallet').select("-password");

            if (!user){
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            switch (user.type){
                case 'trust':
                    if (user.trustWallet.length === 0 || user.trustWallet === undefined) {
                        user.status = "unverified";
                        await user.save();
                        return res.status(400).json({
                            success: false,
                            error: 'wallet not found'
                        });
                    }

                        /*let trustWallet = await CWallet.findOne({_id: user.trustWallet});

                        let totalBalance = new BigNumber(0);


                        //TODO
                        for (let currWallet of trustWallet.wallets){


                            let db_pfr = await Crypto.findOne({$and: [{name: 'PFR'}, {active: true}]});

                            let coinDecimal = new BigNumber('10').pow(db_pfr.decimals);

                            let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);

                            let balance = new BigNumber(await contract.methods.balanceOf(currWallet.address).call()).dividedBy(coinDecimal);

                            currWallet.balancePfr = balance.toString(10);
                            currWallet.countNode = balance.idiv(10000).toString(10);

                            totalBalance = totalBalance.plus(balance);
                        }

                        console.log(totalBalance.toString(10));*/

                    let allWalletsCurrUser = await CWallet.find({owner: user._id});

                    let totalBalanceCurrUser = new BigNumber(0);

                    let db_pfr = await Crypto.findOne({$and: [{name: 'PFR'}, {active: true}]});
                    let coinDecimal = new BigNumber('10').pow(db_pfr.decimals);
                    let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);

                    for (let currWallet of allWalletsCurrUser){
                        let balanceCurrWallet = new BigNumber(await contract.methods.balanceOf(currWallet.address).call()).dividedBy(coinDecimal);

                        currWallet.balancePfr = balanceCurrWallet.toString(10);
                        currWallet.countNode = balanceCurrWallet.idiv(10000).toString(10);

                        await currWallet.save();

                        totalBalanceCurrUser = totalBalanceCurrUser.plus(balanceCurrWallet);
                    }

                    if (totalBalanceCurrUser.comparedTo(10000) > -1){
                        await User.update({_id: user._id}, {$set:{status: 'active'}});

                        return res.json({
                            success: true,
                        });
                    }
                    else {
                        await User.update({_id: user._id}, {$set:{status: 'unverified'}});

                        return res.status(400).json({
                            success: false,
                            error: 'Not enougth coins'
                        });
                    }

                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Access to the user with this status is closed'
                    });
            }
        }
        catch (err){
            console.log('err /CheckWallet: '+ err);
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });

    router.post('/addConfirmWallet', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            let user = await User.findOne({username: req.user.username}).populate("trustWallet").select("-password");

            if (user === null){
                throw {};
            }

            switch (user.type){
                case 'trust':
                    let address = req.body.address.toLowerCase();
                    let sig = req.body.sig;

                    if (sig.length < 10/*132*/ || address.length < 10 /*42*/){
                        return res.status(400).json({
                            success: false,
                            err: 'Wrong symbol sig'
                        });
                    }

                    let encrAddress = await web3.eth.accounts.recover(user.username, sig);

                    if (encrAddress.toLowerCase() === address){

                        let db_pfr = await Crypto.findOne({$and: [{name: 'PFR'}, {active: true}]});
                        let coinDecimal = new BigNumber('10').pow(db_pfr.decimals);
                        let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);

                        let currBalance = new BigNumber(await contract.methods.balanceOf(address).call()).dividedBy(coinDecimal);

                        //Search in registered wallets
                        let usedWallet = await CWallet.find({address: address});

                        if (usedWallet.length === 0){
                            let newTrustWallet = await createTrustWallet({
                                owner: user._id,
                                address: address,
                                balancePfr: currBalance.toString(10),
                                countNode: currBalance.idiv(10000).toString(10),
                            });

                            await User.update({_id: user._id}, {$push: {trustWallet: newTrustWallet._id}})
                        }
                        else {
                            return res.status(400).json({
                                success: false,
                                error: 'Such a wallet already exists'
                            });
                        }

                        let allWalletsCurrUser = await CWallet.find({owner: user._id});

                        let totalBalanceCurrUser = new BigNumber(0);

                        for (let currWallet of allWalletsCurrUser){
                            let balanceCurrWallet = new BigNumber(await contract.methods.balanceOf(currWallet.address).call()).dividedBy(coinDecimal);

                            totalBalanceCurrUser = totalBalanceCurrUser.plus(balanceCurrWallet);
                        }
                        if (totalBalanceCurrUser.comparedTo(10000) > -1){
                            await User.update({_id: user._id}, {$set:{status: 'active'}});

                            return res.json({
                                success: true,
                            });
                        }
                        else {
                            console.log('111');
                            await User.update({_id: user._id}, {$set:{status: 'unverified'}});

                            return res.status(400).json({
                                success: false,
                                error: 'Not enougth coins'
                            });
                        }



                        //let trustWallet = await CWallet.findOne({_id: user.trustWallet});

                        /*let currwal = await CWallet.find({address: address});

                            if (currwal.length !== 0) {
                                return res.status(400).json({
                                    success: false,
                                    err: 'This wallet is already in use.'
                                });
                            }



                            trustWallet.address = address;
                            trustWallet.date = Date.now();
                            trustWallet.balancePfr = balance.toString(10);
                            trustWallet.countNode = balance.idiv(10000).toString(10);

                            await trustWallet.save();

                            user.status = "active";
                            await user.save();

                            return res.json({
                                success: true,
                            });
                           */
                        /*else {
                            if (user.trustWallet.address !== ''){


                                let balanceCurrAccount = new BigNumber(await contract.methods.balanceOf(user.trustWallet.address).call()).dividedBy(coinDecimal);

                                if (balanceCurrAccount.comparedTo(10000) < 0){
                                    user.status = "unverified";
                                    trustWallet.balancePfr = balanceCurrAccount.toString(10);
                                    trustWallet.countNode = balanceCurrAccount.idiv(10000).toString(10);

                                    trustWallet.save();
                                    await user.save();
                                }
                            }
                            else {
                                user.status = "unverified";

                                trustWallet.balancePfr = '0';
                                trustWallet.countNode = '0';

                                await trustWallet.save();
                                await user.save();
                            }


                            return res.status(400).json({
                                success: false,
                                error: 'Not enougth coins'
                            });
                        }*/
                    }
                    else {
                        return res.status(400).json({
                            success: false,
                            error: 'Wrong account'
                        });
                    }

                case 'escrow':
                    let db_pfr = await Crypto.findOne({$and: [{name: 'PFR'}, {active: true}]});
                    /*let userWallet = await User.findById(req.user._id).select("-password").populate('wallet');

                    let contract = new web3.eth.Contract(require('../abi/' + db_pfr.name.toLowerCase() + '/Token.json'), db_pfr.address);
                    let balance = await contract.methods.balanceOf(userWallet.wallet.address).call();
                    let priceUSD = Math.pow(10, db_pfr.decimals) * priceCoin.value;*/

                    let balance = 0;

                    user.total.find(function (element) {
                        if (element.name === 'pfr'){
                            balance = element.amount;
                        }
                    });

                    let priceCoin = await Price.findOne({name: db_pfr.name});


                    balance *= priceCoin.value;

                    if (balance >= 250){
                        user.statusEscrowBool = true;
                        await user.save();

                        return res.json({
                            success: true,
                        });
                    }

                    if (user.statusEscrowBool === true){
                        user.statusEscrowBool = false;
                        await user.save();
                    }

                    return res.status(400).json({
                        success: false,
                        error: 'Not enougth money'
                    });
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Access to the user with this status is closed'
                    });
            }
        }
        catch (err){
            console.log('err /addConfirmWallet: '+ err);
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });

    router.get('/history', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            let {offset, limit} = req.query;

            let allHistory = await HistoryTransaction.aggregate(
                { $match: {owner: req.user._id}},
                { $project: {items: { $concatArrays: [ "$inPlatform", "$outsidePlatform" ] } } },
            );

            let total = allHistory[0].items.length;

            allHistory = allHistory[0].items.sort((a,b) => {return new Date(b.date) - new Date(a.date)}).slice(offset, limit);

            /*console.log(offset, limit);
            console.log('allHistory', allHistory);
            console.log('countHistory', total);*/

            if (allHistory) {


                return res.json({total: total ,history: allHistory});
            }
            else {
                return res.status(404).json({
                    success: false,
                    error: 'History not found'
                });
            }
        }
        catch (err){
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });
    return router;
};

