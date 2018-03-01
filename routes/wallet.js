const express = require('express');
const router = express.Router();
const path = require('path');

const CWallet = require('../db/models/ConfirmingWallet');

const User = require('../db/models/User.js');
const Crypto = require('../db/models/crypto/Crypto');
const Price = require('../db/models/Price');

const passport = require('passport');

require('../config/passport')(passport);
const jwt = require('jsonwebtoken');

module.exports = web3 => {

    router.post('/withdraw', passport.authenticate('jwt', {session: false}), async (req, res) => {
        try {
            const toAddress = req.body.address;
            let amount = req.body.amount;
            let balance = 0;
            let count = 0;
            let txData = null;
            let receipt = null;
            const user = await User.findById(req.user._id).populate('wallet');

            //find coin in db Crypto
            const coin = await Crypto.findOne({$and: [{name: req.body.currency.toUpperCase()}, {active: true}]});

            if (coin === undefined || coin === null) {
                return res.status(400).json({success: false, error: 'Wrong coin'});
            }
            switch (coin.type) {
                case 'erc20':
                    // get balance
                    amount = amount * Math.pow(10, coin.decimals);
                    const contract = new web3.eth.Contract(require('../abi/'+coin.name.toLowerCase()+'/Token.json'), coin.address);
                    balance = await contract.methods.balanceOf(user.wallet.address).call() - user.holds[coin.name.toLowerCase()] * Math.pow(10, coin.decimals);
                    if (balance < amount) {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    // transfer
                    count = await web3.eth.getTransactionCount(user.wallet.address);
                    // I choose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!

                    txData = await web3.eth.accounts.signTransaction({
                        to: coin.address,
                        gas: 110000,//gasLimit,
                        gasPrice: await web3.eth.getGasPrice(),
                        data: contract.methods.transfer(toAddress, amount).encodeABI(),
                        nonce: count
                    }, user.wallet.privateKey);
                    receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
                    return res.json({
                        success: true,
                    });
                case 'eth':
                    // get balance
                    amount = web3.utils.toWei(amount, 'ether');
                    balance = await web3.eth.getBalance(user.wallet.address) - web3.utils.toWei(user.holds.eth.toString(), 'ether');
                    if (balance < amount) {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    // transfer
                    count = await web3.eth.getTransactionCount(user.wallet.address);
                    let gasLimit = await web3.eth.estimateGas({
                        nonce: count,
                        to: toAddress,
                        value: amount
                    });
                    let txData = await web3.eth.accounts.signTransaction({
                        to: toAddress,
                        gas: gasLimit,
                        gasPrice: await web3.eth.getGasPrice(),
                        value: amount,
                        nonce: count
                    }, user.wallet.privateKey);
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

                        //костыль
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
                        //конец костыля

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

                    console.log('address', address);
                    console.log('sig', sig);

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
                    let userWallet = await User.findById(req.user._id).select("-password").populate('wallet');

                    let contract = new web3.eth.Contract(require('../abi/' + db_pfr.name.toLowerCase() + '/Token.json'), db_pfr.address);

                    let priceCoin = await Price.findOne({name: db_pfr.name});
                    let balance = await contract.methods.balanceOf(userWallet.wallet.address).call();
                    let priceUSD = Math.pow(10, db_pfr.decimals) * priceCoin.value;
                    balance *= priceUSD;

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

