const express = require('express');
const router = express.Router();
const path = require('path');

const User = require('../db/models/User.js');
const Deal = require('../db/models/Deal.js');
const Attachment = require('../db/models/Attachment.js');

const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');

require('../config/passport')(passport);
const jwt = require('jsonwebtoken');


router.get('/:id', passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    Attachment.findById(req.params.id).populate({
            path: 'message',
            populate: {
                path: 'deal',
                model: Deal,
                populate: [
                    {
                        path: 'seller',
                        select: ['-password', '-wallet']
                    },
                    {
                        path: 'buyer',
                        select: ['-password', '-wallet']
                    }
                ]
            }
        })
        .then(function (doc) {
            if (!doc) {
                return res.status(404).json({
                    error: "File not found"
                });
            }
            if (!doc.message.deal.getUserRole(req.user._id.toString())) {
                return res.status(403).json({error: "Permission denied"});
            }
            return res.sendFile(path.join(__dirname, '../private-docs', doc._id+'_'+doc.name));
        }, function (err) {
            return res.status(500).json(err);
        });
});



module.exports = router;