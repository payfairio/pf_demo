const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});


const User = require('../db/models/User.js');
const History = require('../db/models/HistoryTransaction');

function createHistory (data) {
    return new History(data).save();
}

User.find({historyTransaction: {$exists: false}}).then(async function (users) {
    await Promise.all(users.map(async function (user) {
        let historyTransactions = await createHistory({
            owner: user._id,
            outsidePlatform: [],
            inPlatform: []
        });
        user.historyTransaction = historyTransactions._id;
        await user.save();
    }));
    console.log("done\n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});