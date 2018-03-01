/**
 * Generate wallets for users which didnt have them
 */
const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');
const Account = require('../db/models/crypto/Account.js');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

function createAccount (data) {
    return new Account(data).save();
}

User.find({wallet: {$exists: false}}).then(async function (users) {
    await Promise.all(users.map(async function (user) {
        let newAccount = web3.eth.accounts.create();
        let account = await createAccount({
            address: newAccount.address,
            privateKey: newAccount.privateKey,
            coin: 'eth',
            owner: user._id
        });
        user.wallet = account._id;
        await user.save();
    }));
    console.log("done\n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});