const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');


User.find({}).then(async function (users) {
    for (let j in users){
        users[j].lastDateResetPassword = Date.now();
        console.log('await users[j].save()', await users[j].save());
        await users[j].save();
    }

    console.log("done! add new fields lastDateResetPassword' \n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});