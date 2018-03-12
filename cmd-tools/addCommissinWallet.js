const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const Cryptos = require('../db/models/crypto/Crypto');
const ComWallet = require('../db/models/crypto/commissionWallet');

const db_cryptos = Cryptos.find({});

async function createCommissionWallet() {
    try {
        let newWallet = await new ComWallet({});
        await newWallet.save();
        return true;
    }
    catch {
        return false;
    }
}

console.log(createCommissionWallet());

ComWallet.findOne({}).then(async function (ComWallet) {
    for (let i in db_cryptos){
        let currCoin = {
            coin: db_cryptos[i],
            name: db_cryptos[i].name.toLowerCase(),
            amount: "0"
        };
        ComWallet.trust.push(currCoin);
        ComWallet.escrow.push(currCoin);
        ComWallet.maintenance.push(currCoin);
    }
    await wallet.save();
    console.log("done! add commission wallet' \n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});
