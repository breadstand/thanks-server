const express = require('express')
const router = express.Router()
const Post = require('../../../models/post').Post
const { safeCopy } = require('../../../utils/utils')

router.get('/', async (req, res) => {

    try {
        // has_more
        let has_more = false
        let has_more_after = false

        // ending_before
        // starting_after
        let query = {
            user: req.userId,
            draft: false,
            deleted: { $ne: true }
        }
        let sort = {
            lastUpdate: 'desc',
            created: 'desc'
        }
        let limit = 12;

        if (req.query.limit && req.query.limit < 100) {
            limit = Number(req.query.limit)
        }
        if (req.query.category) {
            query.category = req.query.category
        }
        if (req.query.draft) {
            query.draft = req.query.draft
        }
        if (req.query.category) {
            query.category = req.query.category
        }
        if (req.query.ending_before) {
            has_more_after = true
            query.lastUpdate = { $lt: req.query.ending_before }
            // Increase limit so we can detect has_more and has_more_before
        }
        if (req.query.starting_after) {
            has_more = true
            query.lastUpdate = { $gt: req.query.starting_after }
            sort.lastUpdate = 'asc'
            // Increase limit so we can detect has_more and has_more before
        }

        if (req.query.count_posts) {
            delete query.lastUpdate
            // For count requests, we'll skip the find
            let count = await Post.countDocuments(query)
            res.json({
                object: "number",
                success: true,
                data: count
            })
        } else {
            let posts = await Post.find(query)
                .sort(sort)
                .limit(limit + 1)

            // When the query is "starting_after", the
            // sort is reversed, so we have to reverse it back.
            if (req.query.starting_after) {
                if (posts.length >= limit + 1) {
                    has_more_after = true
                    posts.pop()
                }
                posts.sort((a, b) => {
                    if (a.lastUpdate > b.lastUpdate) {
                        return -1
                    }
                    return 1
                })
            } else {
                if (posts.length > limit) {
                    has_more = true
                    posts.pop()
                }
            }

            res.json({
                object: "list",
                success: true,
                data: posts,
                has_more: has_more,
                has_more_after: has_more_after
            })
        } 
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})



router.post('/', (req, res) => {

    let postData = req.body
    delete req.body._id
    let post = new Post(postData)
    post.user = req.userId;
    post.save()
        .then(savedPost => {
            res.status(200).send({
                success: true,
                data: savedPost
            })
        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => {
            res.json({
                success: true,
                data: post
            })
        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

router.put('/:id', (req, res) => {

    let options = {
        returnDocument: 'after',
    }

    let postUpdate = req.body;
    delete postUpdate._id
    delete postUpdate.user

    Post.findOneAndUpdate(
        { _id: req.params.id, user: req.userId }, postUpdate, options)
        .then(updatedPost => {
            res.status(200).json({
                success: true,
                data: updatedPost
            })
        })
        .catch(err => {
            res.status(500).send('Internal server error')
        })
})



module.exports = router