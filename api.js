var mongoose = require('mongoose');
var crypto = require('crypto');



var User = require('./db/models/User.js');
var Deal = require('./db/models/Deal.js');
var Message = require('./db/models/Message.js');

// User API

exports.createUser = function (userData) {
    var user = {
        _id: new mongoose.Types.ObjectId(),
        username: userData.username,
        email: userData.email,
        password: hash(userData.password),
        type: userData.type
    };
    return new User(user).save()
};

exports.getUser = function (id) {
    return User.findById(id)
};

exports.getUserByEmail = function (email) {
    return User.findOne({email: email});
};

exports.checkUser = function (userData) {
    return User
        .findOne({email: userData.email})
        .then(function (doc) {
            if (doc.password === hash(userData.password)) {
                return Promise.resolve(doc)
            } else {
                return Promise.reject("Error wrong")
            }
        }, function (err) {
            return Promise.reject("Error wrong")
        });
};

// Deal API

exports.createDeal = function (data) {
    var deal = {
        _id: new mongoose.Types.ObjectId(),
        name: data.name,
        seller: data.seller,
        buyer: data.buyer
    };
    return new Deal(deal).save();
};

exports.getDeal = function (id) {
    return Deal.findOne({dId: id}).populate('seller').populate('buyer').populate('messages');
};

exports.getUserDeals = function (id) {
    return Deal.find({$or: [{'buyer': id}, {'seller': id}]}).populate('seller').populate('buyer').sort('-created_at');
};

function hash(text) {
    return crypto.createHash('sha1')
        .update(text).digest('base64')
}