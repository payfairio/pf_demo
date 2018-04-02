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

const max_suggestion_per_user = 3;
const need_likes_to_change_status = 5;
const need_dislikes_to_change_status = 5;

const statuses = [
    'Active',
    'In Process',
    'Approved',
    'Disapproved'
];
/**
 * To generate list of suggestions
 */
router.get('/', passport.authenticate('jwt', {session: false}), (req, res) => {
    let {offset, limit, order, sortBy} = req.query;
    order = order === 'true' ? -1 : 1;

    let filter = req.query.status == 4 ? {author: req.user._id} : {status: statuses[req.query.status]}

    Suggestions.count(filter)
        .then(total => {
            Suggestions.find(filter)
            .populate('author', ['-password', '-wallet'])
            .sort({
                [sortBy]: order
            })
            .skip(+offset)
            .limit(+limit)
                .then(docs => {
                    return res.json({total, data: docs});
                }).catch(error => {
                    return res.json(error);
                });
        }).catch(error => {
            return res.json(error);
        });
});

/**
 * To generate simple suggestion
 */
router.get('/suggestion/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
        if (req.user.type !== 'trust') {
            return res.status(403).json({
                error: "Forbidden"
            });
        }
        Suggestions.findOne({
                _id: req.params.id
            }).populate('author', ['-password', '-wallet'])
            .then(doc => {
                if (!doc) {
                    return res.status(404).json({
                        error: "Suggestion not found"
                    });
                }
                can_vote = !(doc.like.indexOf(req.user._id) != -1 || doc.dislike.indexOf(req.user._id) != -1);
                return res.json({suggestion: doc, can_vote: can_vote});
            }).catch(err => {
                return res.status(500).json(err);
            });
});

/**
 * To create suggestion
 */
router.post('/create', passport.authenticate('jwt', {session: false}), (req, res) => {
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
        req.getValidationResult().then(result => {
            if (result.array().length > 0) {
                return res.status(400).json({
                    success: false,
                    errors: result.mapped(),
                    msg: 'Bad request'
                });
            }

            Suggestions.find({
                status: statuses[0],
                author: req.user._id,
            }).then(docs => {
                if (docs.length >= max_suggestion_per_user){
                    throw {e_code: 400, msg: "You can have only " + max_suggestion_per_user + " active suggestions"};
                }
                let data = {
                    _id: new mongoose.Types.ObjectId(),
                    name: req.body.name,
                    text: req.body.text,
                    author: req.user._id
                }
                return new Suggestions(data).save();
            }).then(result => {
                return res.json({success: true, suggestion: result});
            }).catch(err => {
                if (err.e_code){
                    return res.status(err.e_code).json({success: false, error: err.msg});
                }
                return res.status(500).json({success: false, error: err});
            });
        });
});

/**
 * To vote for suggestion
 */
router.post('/suggestion/:id/vote', passport.authenticate('jwt', {session: false}), (req, res) => {
        if (req.user.type !== 'trust') {
            return res.status(403).json({
                error: "Forbidden"
            });
        }
        Suggestions.findOne({_id: req.params.id}).populate('author', ['-password', '-wallet'])
            .then(doc => {
                if (!doc) {
                    return res.status(404).json({
                        error: "Suggestion not found"
                    });
                }
                if (doc.like.indexOf(req.user._id) !== -1 || doc.dislike.indexOf(req.user._id) !== -1){
                    return res.status(404).json({
                        error: "You are already voted"
                    });
                }

                if (req.body.value === 1){
                    doc.like.push(req.user._id);
                } else if (req.body.value === 0){
                    doc.dislike.push(req.user._id);
                }

                if (doc.like.length === need_likes_to_change_status && doc.status == statuses[0]) {
                    doc.status = statuses[1];
                }

                if (doc.dislike.length === need_dislikes_to_change_status && doc.status == statuses[0]) {
                    doc.status = statuses[3];
                }

                doc.save();
                return res.json({suggestion: doc, can_vote: false});
            }).catch(err => {
                return res.status(500).json({success: false, error: err});
            });
});

module.exports = router;
