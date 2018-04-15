const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');
const Cryptos = require('../db/models/crypto/Crypto');

/*console.log('delete holds field');
await User.update({}, {$unset: {holds:1}}, {multi: true});
console.log('delete holds field done');*/

User.find({holds: {$exists: true}}).then(async function (users) {
    //console.log('users: ', users);

    /*console.log('delete holds field');
    await User.update({}, {$unset: {holds:1}}, {multi: true});
    console.log('delete holds field done');*/

    let db_crypto = await Cryptos.find({});

    console.log('update start');
    for (let currCoin of db_crypto){
        for (let item of users){
            await User.update({_id: item._id, "total.name": currCoin.name.toLowerCase()}, {$set: {"total.$.holds": '0'}})
        }
    }
    console.log('update done');

    /*let db_cryptos = await Cryptos.find({});
    for (let j in users){
        for (let i in db_cryptos) {
            let currCoin = {
                coin: db_cryptos[i],
                name: db_cryptos[i].name.toLowerCase()
            };
            users[j].total.push(currCoin);
        }
        console.log('await users[j].save()', await users[j].save());
        await users[j].save();
    }*/
    /*users.map(async function (user) {
        for (let i in db_cryptos) {
            let currCoin = {
                coin: db_cryptos[i],
                name: db_cryptos[i].name.toLowerCase()
            };
            user.total.push(currCoin);
        }
        //console.log('user save start', user);
        console.log('await user.save', await user.save());
    });*/
    console.log("done! add new fields Total' \n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});