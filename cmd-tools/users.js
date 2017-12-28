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

User.find({holds: {$exists: false}}).then(async function (users) {
    await Promise.all(users.map(async function (user) {
            user.holds = {eth: 0, pfr: 0};
            user.markModified('holds');
            await user.save();
        })
    );
    console.log("done\n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});