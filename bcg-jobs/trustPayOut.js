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


module.exports = function (){
    setInterval(async function (){
        try{

            let trusts = await User.find({$and:[{type:"trust"}, {status:"active"} ]}).populate('trustWallet');

            let timePayOut = 1000 * 60 * 60 * 24 ;// 1 day

            let payOutTrusts = [];
            let sumNodeTrustWallet = new BigNumber(0);
            let cntActiveTrust = 0;

            let db_pfr = await Crypto.findOne({name: 'PFR'});
            let coinDecimal = new BigNumber('10').exponentiatedBy(db_pfr.decimals);
            let contract = new web3.eth.Contract(require('../abi/pfr/Token.json'), db_pfr.address);


            for (let user of trusts){

                if (web3.utils.isAddress(user.trustWallet.address)){

                    let balanceInSignWallet = new BigNumber(await contract.methods.balanceOf(user.trustWallet.address).call()).dividedBy(coinDecimal);


                    if (balanceInSignWallet.comparedTo(10000) > -1){
                        let dateAddWallet = new Date(user.trustWallet.date).getTime();
                        let dateNow = new Date().getTime();

                        if (dateAddWallet < dateNow - timePayOut){
                            //console.log(user.username);

                            let countNode = balanceInSignWallet.dividedBy(10000);
                            sumNodeTrustWallet = sumNodeTrustWallet.plus(countNode);

                            cntActiveTrust++;

                            user.trustWallet.countNode = countNode.toString(10);
                            user.trustWallet.balancePfr = balanceInSignWallet.toString(10);

                            payOutTrusts.push(user);
                        }
                    }
                }



            }

            if (cntActiveTrust > 0) {
                let comWallet = await CommissionWallet.findOne();
                for (let currCoin of comWallet.trust){

                    let nodeEqCoin =  new BigNumber(currCoin.amount).dividedBy(sumNodeTrustWallet);

                    for (let user of payOutTrusts){
                        user.total.find(function (element) {

                                if (element.name === currCoin.name){

                                    let amountPayOut = nodeEqCoin.multipliedBy(user.trustWallet.countNode).toFixed(8, 1);

                                    if (!amountPayOut.isZero()){
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
            }

        }
        catch (err) {

        }
    }, 1000 * 60 * 60 * 24) // 1 day
};