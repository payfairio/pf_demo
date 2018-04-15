/*
add to users confirmWallet
*/
const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');
const CWallet = require('../db/models/ConfirmingWallet');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

/*function createConfirmWallet (data) {
    return new ConfWallet(data).save();
}*/

/*ConfWallet.find().then(async function (wallets) {
    await Promise.all(wallets.map(async function (wallet) {
        if (wallet.address === null){
            wallet.address = '';
        }
        wallet.balancePfr = '0';
        wallet.countNode = '0';
        wallet.date = Date.now();
        await wallet.save();
    }));

    console.log("done correct ConfirmWallet\n");
    process.exit();

}).catch(function(err) {
    console.log(err);
});*/

User.find({$and: [{trustWallet: {$exists: true}}, {type: 'trust'}]}).then(async function (users){
    await Promise.all(users.map(async function (user) {

        await CWallet.update({_id:user.trustWallet}, {$set:{owner:user._id}});

        let trustWallet = await CWallet.findOne({owner: user._id});
        let arr = [];
        arr.push(trustWallet._id);

        user.trustWallet = arr;
        await user.save();
    }));
    console.log("done createConfirmWallet\n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});
