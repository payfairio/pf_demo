const express = require('express');
const router = express.Router();

const User = require('../db/models/User.js');
const Suggestions = require('../db/models/Suggestions.js');

const mongoose = require('mongoose');
const passport = require('passport');
const config = require('../config/database');
require('../config/passport')(passport);
const jwt = require('jsonwebtoken');

const validator = require('express-validator');
router.use(validator())

router.get('/', passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    Suggestions.find()
        .populate('author')
        .sort('-created_at')
        .then(function (docs) {
            return res.json(docs);
        }).catch(function (err) {
            return res.json(err);
        });
});

router.get('/suggestion/:id', passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    if (req.user.type !== 'trust') {
        return res.status(403).json({
            error: "Forbidden"
        });
    }
    Suggestions.findOne({
            _id: req.params.id
        }).populate('author')
        .then(function (doc) {
            if (!doc) {
                return res.status(404).json({
                    error: "Suggestion not found"
                });
            }
            return res.json(doc);
        }, function (err) {
            return res.status(500).json(err);
        });
});

router.post('/create', passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    if (req.user.type !== 'trust') {
        return res.status(403).json({
            error: "Forbidden"
        });
    }
    req.checkBody({
        name: {
            notEmpty: {
                errorMessage: 'Suggestion name is required'
            }
        },
        text: {
            notEmpty: {
                errorMessage: 'Text is required'
            }
        }
    });
    req.getValidationResult().then(function (result) {
        if (result.array().length > 0) {
            return res.status(400).json({
                success: false,
                errors: result.mapped(),
                msg: 'Bad request'
            });
        }

        let data = {
            _id: new mongoose.Types.ObjectId(),
            name: req.body.name,
            text: req.body.text,
            author: req.user._id
        }
        return new Suggestions(data).save().then(function (result) {
            return res.json({success: true, exchange: result});
        }).catch(function (err) {
            return res.status(500).json({success: false, error: err});
        });
    });
});

module.exports = router;
