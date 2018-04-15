const mongoose = require('mongoose');
const CommissionWallet = require('../db/models/crypto/commissionWallet');
const User = require('../db/models/User');
const Crypto = require('../db/models/crypto/Crypto');
const HistoryTransaction = require('../db/models/HistoryTransaction');

const BigNumber = require('bignumber.js');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

const namePlatform = 'PayFair';

const timePayOut = 1000 * 60 * 60 * 24;// 1 day

module.exports = function (){
    setInterval(async function (){
        try{
            console.log('start function');
            let trusts = await User.find({$and:[{type:"trust"}, {status:"active"} ]}).populate('trustWallet');

            let dateNow = new Date().getTime();

            let payOutTrusts = [];
            let sumNodeTrustWallet = new BigNumber(0);
            let cntActiveTrust = 0;

            let db_pfr = await Crypto.findOne({name: 'PFR'});
            let coinDecimal = new BigNumber('10').exponentiatedBy(db_pfr.decimals);
            let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);



            for (let user of trusts){
                let totalBalanceCurrUser = new BigNumber(0);

                for (let currWallet of user.trustWallet){
                    let dateAddWallet = new Date(currWallet.date).getTime();

                    if (web3.utils.isAddress(currWallet.address) && dateAddWallet < dateNow - timePayOut){
                        let balanceInSignWallet = new BigNumber(await contract.methods.balanceOf(currWallet.address).call()).dividedBy(coinDecimal);

                        totalBalanceCurrUser = totalBalanceCurrUser.plus(balanceInSignWallet);
                    }
                }

                if (totalBalanceCurrUser.comparedTo(10000) > -1){
                    let countNode = totalBalanceCurrUser.dividedBy(10000).toString(10);
                    sumNodeTrustWallet = sumNodeTrustWallet.plus(countNode);

                    user.trustWallet.totalcoin = countNode;

                    cntActiveTrust++;

                    payOutTrusts.push(user);
                }


            }

            console.log('start payout');
            if (cntActiveTrust > 0) {

                let comWallet = await CommissionWallet.findOne();
                for (let currCoin of comWallet.trust){

                    let nodeEqCoin =  new BigNumber(currCoin.amount).dividedBy(sumNodeTrustWallet);

                    for (let user of payOutTrusts){
                        user.total.find(function (element) {

                                if (element.name === currCoin.name){

                                    let amountPayOut = nodeEqCoin.multipliedBy(user.trustWallet.totalcoin).toFixed(8, 1);
                                    if (+amountPayOut !== 0){
                                        element.amount = new BigNumber(element.amount).plus(amountPayOut).toString(10);
                                        currCoin.amount = new BigNumber(currCoin.amount).minus(amountPayOut).toString(10);

                                        User.update({_id: user._id, "total.name": currCoin.name}, {"total.$.amount": element.amount}).catch(err =>{
                                            console.log(err);
                                        });

                                        HistoryTransaction.update({owner: user._id}, {$push:{ inPlatform:
                                                    {fromUser: namePlatform, toUser: user.username, coinName: currCoin.name, charge: true, amount: amountPayOut.toString(10)}
                                            }}).catch(err =>{
                                            console.log(err);
                                        });

                                    }

                                return true;
                                }
                        });
                    }

                }
                await comWallet.save();
                console.log('end payout')
            }

        }
        catch (err) {

        }
    }, timePayOut) // 1 day
};