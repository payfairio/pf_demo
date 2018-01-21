const express = require('express');
const router = express.Router();
const path = require('path');

module.exports = sequelize => {

    const BlogPost = sequelize.import(path.resolve('db/models/mysql/BlogPost.js'));

    router.get('/', async (req, res) => {
        try {
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const total = await BlogPost.count({where: {publish: 1}});
            const posts = await BlogPost.findAll({
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

    router.get('/:url', async (req, res) => {
        try {
            const post = await BlogPost.findOne({where: {url: req.params.url}});
            const content = post.content_html;
            return res.json({content: content});
        } catch (err) {
            return res.status(500).json(err);
        }

    });
    return router;
};
