const express = require('express');
const router = express.Router();
const path = require('path');

const User = require('../db/models/User.js');

const passport = require('passport');
const config = require('../config/database');
const config_crypto = require('../config/crypto');

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
            const coin = req.body.currency.toLowerCase();
            if (!config_crypto.hasOwnProperty(coin)) {
                return res.status(400).json({success: false, error: 'Wrong coin'});
            }
            switch (config_crypto[coin].type) {
                case 'erc20':
                    // get balance
                    amount = amount * Math.pow(10, config_crypto[coin].decimals);
                    const contract = new web3.eth.Contract(require('../abi/'+coin+'/Token.json'), config_crypto[coin].address);
                    balance = await contract.methods.balanceOf(user.wallet.address).call() - user.holds[coin] * Math.pow(10, config_crypto[coin].decimals);
                    if (balance < amount) {
                        return res.status(400).json({
                            success: false,
                            error: 'Not enough money'
                        });
                    }
                    // transfer
                    count = await web3.eth.getTransactionCount(user.wallet.address);
                    // I choose gas price and gas limit based on what ethereum wallet was recommending for a similar transaction. You may need to change the gas price!
                    /*let gasLimit = await web3.eth.estimateGas({
                     nonce: count,
                     to: config_crypto[coin].address,
                     data: contract.methods.transfer(toAddress, amount).encodeABI()
                     });*/
                    txData = await web3.eth.accounts.signTransaction({
                        to: config_crypto[coin].address,
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
    return router;
};

