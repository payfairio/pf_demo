const express = require('express');
const router = express.Router();
const path = require('path');

module.exports = function (sequelize) {

    const BlogPost = sequelize.import(path.resolve('db/models/mysql/BlogPost.js'));

    router.get('/', async function (req, res, next) {
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        try {
            let total = await BlogPost.count({where: {publish: 1}});
            let posts = await BlogPost.findAll({
                limit: limit,
                offset: offset,
                where: {publish: 1},
                order: [['date', 'DESC']]
            });
            return res.json({total: total, items: posts});
        } catch (err) {
            return res.status(500).json(err);
        }
    });

    router.get('/:url', async function (req, res, next) {
        try {
            let post = await BlogPost.findOne({where: {url: req.params.url}});
            let content = post.content_html;
            return res.json({content: content});
        } catch (err) {
            return res.status(500).json(err);
        }

    });
    return router;
};
