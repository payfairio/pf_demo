const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const Cryptos = require('../db/models/crypto/Crypto');
const ComWallet = require('../db/models/crypto/commissionWallet');
const User = require('../db/models/User.js');

User.findOne({}).then(async function (user) {
    let wal = await new ComWallet({trust:[], escrow: [], maintenance: []});
    await wal.save();
    console.log('wal',wal);

    ComWallet.findOne({}).then(async function (ComWallet) {
        console.log('ComWallet',ComWallet);
        const db_cryptos = await Cryptos.find({});
        let arr = [];
        for (let i in db_cryptos){
            let currCoin = {
                coin: db_cryptos[i],
                name: db_cryptos[i].name.toLowerCase(),
                amount: "0"
            };
            arr.push(currCoin);
        }
        console.log('arr',arr);
        ComWallet.trust = arr;
        ComWallet.escrow = arr;
        ComWallet.maintenance = arr;
        await ComWallet.save();
        console.log("done! add commission wallet' \n");
        process.exit();

    }).catch(function(err) {
        console.log('Wal err',err);
    });

}).catch(function(err) {
    console.log('U err',err);
});
