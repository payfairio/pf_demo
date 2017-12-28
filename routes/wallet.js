const express = require('express');
const router = express.Router();
const path = require('path');

const User = require('../db/models/User.js');

const passport = require('passport');
const config = require('../config/database');
const config_crypto = require('../config/crypto');

require('../config/passport')(passport);
const jwt = require('jsonwebtoken');

module.exports = function (web3) {

    router.post('/withdraw', passport.authenticate('jwt', {
        session: false
    }), async function (req, res, next) {
        const toAddress = req.body.address;
        let amount = req.body.amount;
        let balance = 0;
        User.findById(req.user._id).populate('wallet').then(async function (user) {
            switch (req.body.currency.toLowerCase()) {
                case 'pfr':
                    // get balance
                    amount = amount * Math.pow(10, 8);
                    const contract = new web3.eth.Contract(require('../abi/Token.json'), config_crypto.pfr_address);
                    balance = await contract.methods.balanceOf(user.wallet.address).call() - user.holds.pfr * Math.pow(10, 8);
                    if (balance >= amount) {
                        // transfer
                        let count = await web3.eth.getTransactionCount(user.wallet.address);
                        // I chose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!
                        /*let gasLimit = await web3.eth.estimateGas({
                            nonce: count,
                            to: config_crypto.pfr_address,
                            data: contract.methods.transfer(toAddress, amount).encodeABI()
                        });*/
                        let txData = await web3.eth.accounts.signTransaction({
                            to: config_crypto.pfr_address,
                            gas: 110000,//gasLimit,
                            gasPrice: await web3.eth.getGasPrice(),
                            data: contract.methods.transfer(toAddress, amount).encodeABI(),
                            nonce: count
                        }, user.wallet.privateKey);
                        let receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
                        return res.json({
                            success: true,
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    break;
                case 'eth':
                    // get balance
                    amount = web3.utils.toWei(amount, 'ether');
                    balance = await web3.eth.getBalance(user.wallet.address) - web3.utils.toWei(user.holds.eth.toString(), 'ether');
                    if (balance >= amount) {
                        // transfer
                        let count = await web3.eth.getTransactionCount(user.wallet.address);
                        // I chose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!
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
                        let receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
                        return res.json({
                            success: true,
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Wrong coin'
                    });
            }
        }).catch(function (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                error: err
            });
        });
    });
    return router;
};

