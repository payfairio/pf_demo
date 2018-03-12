const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');

User.find({}).then(async function (users) {
    for (let i in users){
        let userCHG = users[i];
        userCHG.total.find(function (element) {
            element.amount = String(element.amount);
        });
        await userCHG.save();
    }
    console.log("done\n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});