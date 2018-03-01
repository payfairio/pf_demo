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
const ConfWallet = require('../db/models/ConfirmingWallet');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

function createConfirmWallet (data) {
    return new ConfWallet(data).save();
}

User.find({$and: [{trustWallet: {$exists: false}}, {type: 'trust'}]}).then(async function (users){
    await Promise.all(users.map(async function (user) {
        let CWallet = await createConfirmWallet({
            address: null
        });
        user.trustWallet = CWallet._id;
        await user.save();
    }));
    console.log("done createConfirmWallet\n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});