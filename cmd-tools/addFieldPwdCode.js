const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');


User.find({changePwdCode: {$exists: false}}).then(async function (users) {
    for (let j in users){
        users[j].changePwdCode = null;
        await users[j].save();
    }

    console.log("done! add fields changePwdCode' \n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});