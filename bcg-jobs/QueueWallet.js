const mongoose = require('mongoose');
const User = require('../db/models/User');
const Crypto = require('../db/models/crypto/Crypto');
const mainWallet = require('../config/mainWallet');
const HistoryTransaction = require('../db/models/HistoryTransaction');

const settings = require('../config/settings')('bcg-mainWallet');

const BigNumber = require('bignumber.js');
const queue = require('queue');
const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

module.exports = function (){
    setInterval(async function (){
        try{
            console.log('refresh balance');
            let users = await User.find({$or:[{type:'client'}, {type:'escrow'}]}).populate('wallet').populate('historyTransaction').select('-password');

            let db_crypto = await Crypto.find({name:{$nin:['ETH']}});
            let db_crypto_eth = await Crypto.findOne({name: 'ETH'});
            let gasPrice = web3.utils.toBN(await web3.eth.getGasPrice());
            let q = queue();
            q.concurrency = 5;
            for (let i in users){
                let user = users[i];
                q.push(async function () {
                        try{

                            let balanceEthInGateWait = web3.utils.toBN(await web3.eth.getBalance(user.wallet.address));
                            if (!balanceEthInGateWait.isZero()) {

                                //Token Erc20 transfer
                                //Use BIG NUMBERS Web3 and BigNumbers.js
                                for (let j in db_crypto)
                                {
                                    let coinName = db_crypto[j].name.toLowerCase();
                                    let coinAddress = db_crypto[j].address;
                                    let coinDecimal = web3.utils.toBN('10').pow(web3.utils.toBN(String(db_crypto[j].decimals)));

                                    let contract = new web3.eth.Contract(require('../abi/' + coinName + '/Token.json'), coinAddress);
                                    let balanceCurrTokenInGateWait = new BigNumber(await contract.methods.balanceOf(user.wallet.address).call());

                                    //console.log(balanceCurrTokenInGateWait.toString());

                                    if (!balanceCurrTokenInGateWait.isZero()){
                                        balanceEthInGateWait = web3.utils.toBN(await web3.eth.getBalance(user.wallet.address));

                                        let contractData = await contract.methods.transfer(mainWallet.mWallet.address, balanceCurrTokenInGateWait.toString(10));
                                        let coefReserveGas = web3.utils.toBN('2'); // reserve gas for transfere token  x2
                                        let amountGasForTransaction_token = web3.utils.toBN(await contractData.estimateGas({gas: 500000, from: user.wallet.address})).mul(coefReserveGas);
                                        let amountEthForTransaction_token = amountGasForTransaction_token.mul(gasPrice);

                                        if (balanceEthInGateWait.cmp(amountEthForTransaction_token) === 1){
                                            let txData = await web3.eth.accounts.signTransaction({
                                                to: coinAddress,
                                                gas: amountGasForTransaction_token,
                                                gasPrice: gasPrice,
                                                data: contractData.encodeABI(),
                                            }, user.wallet.privateKey);

                                            user.total.find(function (element) {
                                                if (element.name === coinName){
                                                    let calculateAmountCoin = new BigNumber(element.amount).multipliedBy(coinDecimal).plus(balanceCurrTokenInGateWait);
                                                    calculateAmountCoin = calculateAmountCoin.dividedBy(coinDecimal).toString(10);
                                                    element.amount = calculateAmountCoin;
                                                    return true;
                                                }
                                            });

                                            await user.save();

                                            //console.log('history', balanceCurrTokenInGateWait.dividedBy(coinDecimal).toString(10));
                                            await HistoryTransaction.update({owner: user._id}, {$push:{outsidePlatform:
                                                        {coinName: coinName, charge: true, amount: balanceCurrTokenInGateWait.dividedBy(coinDecimal).toString(10)}
                                                }});

                                            let receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);
                                            //console.log(receipt.transactionHash);



                                        }
                                    }
                                }

                                //Ethereum transfer
                                //Use BIG NUMBERS Web3
                                balanceEthInGateWait = web3.utils.toBN(await web3.eth.getBalance(user.wallet.address));

                                let amountGasForTransaction_eth = web3.utils.toBN(await web3.eth.estimateGas({from: user.wallet.address, to: mainWallet.mWallet.address, value: balanceEthInGateWait}));
                                let amountEthForTransaction_eth = amountGasForTransaction_eth.mul(gasPrice);
                                let valueTransaction = balanceEthInGateWait.sub(amountEthForTransaction_eth);

                                if (balanceEthInGateWait.cmp(amountEthForTransaction_eth) === 1) {
                                    let txData = await web3.eth.accounts.signTransaction({
                                        to: mainWallet.mWallet.address,
                                        from: user.wallet.address,
                                        gas: amountGasForTransaction_eth,
                                        gasPrice: gasPrice,
                                        value: valueTransaction,
                                    }, user.wallet.privateKey);

                                    user.total.find(function (element) {
                                        if (element.name === db_crypto_eth.name.toLowerCase()){
                                            let amountCoinInDb = web3.utils.toBN(web3.utils.toWei(element.amount, 'ether'));
                                            element.amount = web3.utils.fromWei(amountCoinInDb.add(valueTransaction).toString(10), 'ether'); // do not use "+"
                                            return true;
                                        }
                                    });
                                    await user.save();

                                    //console.log('history', web3.utils.fromWei(valueTransaction.toString(10)));
                                    await HistoryTransaction.update({owner: user._id}, {$push:{outsidePlatform:
                                                {coinName: 'eth', charge: true, amount: web3.utils.fromWei(valueTransaction.toString(10), 'ether')}
                                        }});


                                    let receipt = await web3.eth.sendSignedTransaction(txData.rawTransaction);

                                    //Block hash transaction
                                    //console.log(receipt.transactionHash);

                                }
                            }
                        }
                        catch (err) {
                            console.log(err);
                        }
                })
            }
            q.start(function (err) {
                if (err) throw err;
                console.log('refresh done')
            });
        }
        catch (err) {
            console.log(err);
        }

    }, 1000 * settings.time_to_refresh_balance);
};