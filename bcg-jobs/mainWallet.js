const mongoose = require('mongoose');
const User = require('../db/models/User');
const Crypto = require('../db/models/crypto/Crypto');
const mainWallet = require('../config/mainWallet');

const settings = require('../config/settings')('bcg-mainWallet');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

//out 'Error: Invalid JSON RPC response: "' and "gas required exceeds allowance or always failing transaction" ???



module.exports = function (){
    setInterval(async function () {
        try {
            console.log('refresh balance');
            let users = await User.find({$or:[{type:'client'}, {type:'escrow'}]}).populate('wallet').select('-password');

            let db_crypto = await Crypto.find({name:{$nin:['ETH']}});
            let db_crypto_eth = await Crypto.findOne({name: 'ETH'});

            let gasPrice = await web3.eth.getGasPrice();

            users.map(async function (user) {

                let gasPrice = await web3.eth.getGasPrice();

                for (let i in db_crypto) {
                    let coinName = db_crypto[i].name.toLowerCase();
                    switch (db_crypto[i].typeMonet) {
                        case 'erc20':
                            let contract = new web3.eth.Contract(require('../abi/' + coinName + '/Token.json'), db_crypto[i].address);
                            let balanceErc20 = await contract.methods.balanceOf(user.wallet.address).call();

                            if (balanceErc20 === 0) {
                                continue;
                            }


                            let gasCurrCoin = await contract.methods.transfer(mainWallet.mWallet.address, balanceErc20).estimateGas({from: user.wallet.address}) * 3; // default coeff 1.5
                            let count = await web3.eth.getTransactionCount(user.wallet.address);
                            let gasReserveCurrCoin = gasCurrCoin * gasPrice * 3; //type coin Erc20; Coefficient reserve - default: 1.5

                            if (balanceErc20 > 0) {

                                let balanceCurrETH = await web3.eth.getBalance(user.wallet.address);
                                if (balanceCurrETH >= gasReserveCurrCoin){

                                    //check and transfer token Erc20
                                    let txData = await web3.eth.accounts.signTransaction({
                                        to: db_crypto[i].address,
                                        gas: gasCurrCoin.toString(),
                                        gasPrice: gasPrice.toString(),
                                        data: contract.methods.transfer(mainWallet.mWallet.address, balanceErc20.toString()).encodeABI(),
                                        nonce: count.toString()
                                    }, user.wallet.privateKey);
                                    let receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);

                                    user.total.find(function (element) {
                                        if (element.name === db_crypto[i].name.toLowerCase()){
                                            element.amount = element.amount + Number((balanceErc20) / Math.pow(10, db_crypto[i].decimals)); // do not use "+="
                                            return true;
                                        }
                                    });
                                    await user.save();
                                }
                                else {
                                    let balanceUserETHInMainWallet = user.total.find(function (element) {
                                        if (element.name === db_crypto_eth.name.toLowerCase()){
                                            return true;
                                        }
                                    });

                                    //gas to gatewait wallet
                                    if (web3.utils.toWei(balanceUserETHInMainWallet.amount.toString(), 'ether') > gasReserveCurrCoin){
                                        let countMainWallet = await web3.eth.getTransactionCount(mainWallet.mWallet.address);
                                        let txData = await web3.eth.accounts.signTransaction({
                                            to: user.wallet.address,
                                            from: mainWallet.mWallet.address,
                                            gas: '21000',
                                            gasPrice: gasPrice.toString(),
                                            value: (gasReserveCurrCoin).toString(),
                                            nonce: countMainWallet
                                        }, mainWallet.mWallet.privateKey);

                                        await web3.eth.sendSignedTransaction(txData.rawTransaction);

                                        user.total.find(function (element) {
                                            if (element.name === db_crypto_eth.name.toLowerCase()){
                                                element.amount = element.amount - Number(web3.utils.fromWei((gasReserveCurrCoin).toString())); // do not use "+="
                                                return true;
                                            }
                                        });
                                        await user.save();
                                    }
                                }

                            }
                            break;
                        default:
                            console.log('type coin not found');
                    }
                }

                //check and transfer ETHEREUM
                let balanceETH = await web3.eth.getBalance(user.wallet.address);

                let count = await web3.eth.getTransactionCount(user.wallet.address);
                let gasLimitETH = await web3.eth.estimateGas({nonce: count, to: mainWallet.mWallet.address, value: balanceETH});
                let gasReserve = gasLimitETH * gasPrice; // Coefficient reserve - default: 1.5

                if (balanceETH > gasReserve){
                    //add to main wallet
                    let txData = await web3.eth.accounts.signTransaction({
                      to: mainWallet.mWallet.address,
                      gas: gasLimitETH.toString(),
                      gasPrice: gasPrice.toString(),
                      value: (balanceETH - gasReserve).toString(),
                      nonce: count.toString()
                    }, user.wallet.privateKey);

                    let receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
                    user.total.find(function (element) {
                        if (element.name === db_crypto_eth.name.toLowerCase()){
                            element.amount = element.amount + Number(web3.utils.fromWei((balanceETH - gasReserve).toString())); // do not use "+="
                            return true;
                        }
                    });
                    await user.save();
                }
            })
        }
        catch (err) {
            console.log(err);
        }
    }, 1000 * settings.time_to_refresh_balance);
};
