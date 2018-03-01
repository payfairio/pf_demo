/**
 * Добавление статуса для escrow "statusEscrowBool".
 */
const config = require('../config/database');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.database, {
    useMongoClient: true
});

const User = require('../db/models/User.js');


User.find({$and: [{statusEscrowBool: {$exists: false}}, {type: 'escrow'}]}).then(async function (users) {
    await Promise.all(users.map(async function (user) {
        user.statusEscrowBool = false;
        await user.save();
    }));
    console.log("done! add to escrow new field 'statusEscrowBool' \n");
    process.exit();
}).catch(function(err) {
    console.log(err);
});