const express = require('express');
const router = express.Router();
const path = require('path');

const CWallet = require('../db/models/ConfirmingWallet');

const User = require('../db/models/User.js');
const Crypto = require('../db/models/crypto/Crypto');
const Price = require('../db/models/Price');

const mainWallet = require('../config/mainWallet');

const passport = require('passport');

require('../config/passport')(passport);
const jwt = require('jsonwebtoken');

module.exports = web3 => {

    router.post('/withdraw', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            let toAddress = req.body.address;
            let amount = req.body.amount;
            let balance = 0;
            let balanceEthMainWallet =  await web3.eth.getBalance(mainWallet.mWallet.address);
            let count = 0;
            let txData = null;
            let receipt = null;
            let gasPrice = await web3.eth.getGasPrice();
            const user = await User.findById(req.user._id).populate('wallet');

            //find coin in db Crypto
            let coin = await Crypto.findOne({$and: [{name: req.body.currency.toUpperCase()}, {active: true}]});

            if (coin === undefined || coin === null) {
                return res.status(400).json({success: false, error: 'Wrong coin'});
            }

            switch (coin.typeMonet) {
                case 'erc20':
                    //Minimum amount of transfer
                    if (amount < 100){
                        return res.status(400).json({
                            success: false,
                            error: 'Minimum transfer limit'
                        });
                    }
                    // get balance
                    const contract = new web3.eth.Contract(require('../abi/'+coin.name.toLowerCase()+'/Token.json'), coin.address);
                    let balanceCurrCoinMainWallet = await contract.methods.balanceOf(mainWallet.mWallet.address).call();
                    user.total.find(function (element) {
                        if (element.name === coin.name.toLowerCase()){
                            balance = element.amount - user.holds[coin.name.toLowerCase()];
                            if (balance > amount){
                                element.amount = element.amount - Number(amount); //do not use '-="
                            }
                            return true;
                        }
                    });

                    let balanceInWalletEth = user.total.find(function (element) {
                        if (element.name === 'eth'){
                            return true;
                        }
                    });
                    let amountErc20 = amount * Math.pow(10, coin.decimals);
                    let gasCurrCoin = await contract.methods.transfer(toAddress, amountErc20.toString()).estimateGas({from: mainWallet.mWallet.address}) * 3;
                    if (balance < amount || Number(web3.utils.toWei(balanceInWalletEth.amount.toString(), 'ether')) < Number(gasCurrCoin)) {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    await user.save();
                    // transfer
                    count = await web3.eth.getTransactionCount(mainWallet.mWallet.address);
                    let txDataErc20 = await web3.eth.accounts.signTransaction({
                        to: coin.address,
                        gas: gasCurrCoin.toString(),
                        gasPrice: gasPrice.toString(),
                        data: contract.methods.transfer(toAddress, amountErc20.toString()).encodeABI(),
                        nonce: count,
                    }, mainWallet.mWallet.privateKey);

                    receipt = await web3.eth.sendSignedTransaction(txDataErc20.rawTransaction);

                    return res.json({
                        success: true,
                    });
                case 'eth':
                    amount = web3.utils.toWei(amount, 'ether');
                    user.total.find(function (element) {
                        if (element.name === 'eth'){
                            balance = web3.utils.toWei(element.amount.toString(), 'ether') - web3.utils.toWei(user.holds.eth.toString(), 'ether');
                            if (balance > amount){
                                element.amount = element.amount - web3.utils.fromWei(amount); //do not use '+="
                            }
                            return true;
                        }
                    });

                    if (balance < amount || balance > balanceEthMainWallet) {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    await user.save();
                    // transfer
                    count = await web3.eth.getTransactionCount(mainWallet.mWallet.address);
                    let gasLimit = await web3.eth.estimateGas({nonce: count, to: toAddress, value: amount});

                    let txData = await web3.eth.accounts.signTransaction({
                        to: toAddress,
                        gas: gasLimit.toString(),
                        gasPrice: gasPrice,
                        value: amount.toString(),
                        nonce: count,
                        chainId: 3
                    }, mainWallet.mWallet.privateKey);

                    receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);

                    return res.json({
                        success: true,
                    });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });

    router.post('/checkWallet', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            let user = await User.findOne({username: req.user.username}).select("-password");

            if (user.length === 0 || user === undefined || user === null){
                throw {};
            }

            switch (user.type){
                case 'trust':
                    let address = await User.findOne({$and: [{username: req.user.username}, {trustWallet: { $exists: true }}]}).populate('trustWallet').select({trustWallet: 1});

                        if (address === null){
                            user.status = "unverified";
                            await user.save();

                            return res.status(400).json({
                                success: false,
                                error: 'wallet not found'
                            });
                        }
                        else if (address.trustWallet === null) {
                            user.status = "unverified";
                            await user.save();

                            return res.status(400).json({
                                success: false,
                                error: 'wallet not found'
                            });
                        }

                        let db_pfr = await Crypto.findOne({$and: [{name: 'PFR'}, {active: true}]});

                        let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);

                        let balance = await contract.methods.balanceOf(address.trustWallet.address).call() * Math.pow(10, db_pfr.decimals);

                        if (balance >= 10000){
                            user.status = "active";
                            await user.save();
                            return res.json({
                                success: true,
                            });
                        }
                        else {
                            user.status = "unverified";
                            await user.save();

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

            return res.status(500).json({
                success: false,
            });
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
                    let address = req.body.address;
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

                        let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);

                        let balance = await contract.methods.balanceOf(address).call() * Math.pow(10, db_pfr.decimals);

                        if (balance >= 10000){
                            let currwal = await CWallet.find({address: address});

                            if (currwal.length !== 0) {
                                return res.status(400).json({
                                    success: false,
                                    err: 'This wallet is already in use.'
                                });
                            }

                            /*let confirmWallet = await new CWallet({
                                address: address,
                            }).save();*/
                            let confWalletCurrUser = await CWallet.findOne({_id: user.trustWallet._id});
                            confWalletCurrUser.address = address;
                            await confWalletCurrUser.save();

                            user.status = "active";
                            await user.save();

                            return res.json({
                                success: true,
                            });

                        }
                        else {
                            if (user.trustWallet.address !== null){
                                let balanceCurrAccount = await contract.methods.balanceOf(user.trustWallet.address).call() * Math.pow(10, db_pfr.decimals);

                                if (balanceCurrAccount < 10000){
                                    user.status = "unverified";
                                    await user.save();
                                }
                            }
                            else {
                                user.status = "unverified";
                                await user.save();
                            }


                            return res.status(400).json({
                                success: false,
                                error: 'Not enougth coins'
                            });
                        }
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

            return res.status(500).json({
                success: false,
            });
        }
        catch (err){
            console.log('err /addConfirmWallet: '+ err);
            return res.status(500).json({
                success: false,
                error: err
            });
        }
    });
    return router;
};

