const express = require('express')
const router = express.Router()
const Post = require('../../../models/post').Post
const User = require('../../../models/user').User
const {safeCopy} = require('../../../utils/utils')




router.get('/',(req,res) => {

    // ending_before
    // starting_after
    let query = {
        user: req.userId, 
        draft: false,
        deleted: {$ne: true}
    }
    let limit = 9;
    if (req.query.limit) {
        limit = Number(req.query.limit)
    }
    if (req.query.category) {
        query.category = req.query.category
    }
    if (req.query.draft) {
        query.draft = req.query.draft
    }
    if (req.query.ending_before) {
        query._id = { $lt: req.query.ending_before }
    }
    Post.find(query)
        .sort({lastUpdate: 'desc',created: 'desc'})
        .limit(limit+1)
        .then( posts => {
            // has_more
            let has_more = false
            if (posts.length > limit) {
                has_more = true
                posts.pop()
            }
        res.json({ success: true,
                data: posts,
                has_more: has_more
        })

    }).catch(err => {
        res.status(500).send('Internal server error')
    })
})



router.post('/',(req,res) => {

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
    }).catch( err =>{
        console.log(err)
        res.status(500).send('Internal server error')
    })
})

router.get('/:id',(req,res) => {
    Post.findById(req.params.id)
    .then( post => {
        res.json({
            success: true,
            data: post
        })
    }).catch(err => {
        console.log(err)
        res.status(500).send('Internal server error')
    })
})

router.put('/:id',(req,res) => {

    let options = {
        returnDocument: 'after',
    }

    let postUpdate = req.body;
    delete postUpdate._id 
    delete postUpdate.user

    Post.findOneAndUpdate(
        { _id: req.params.id, user: req.userId},postUpdate,options)
        .then( updatedPost => {
            res.status(200).json({
                success: true,
                data: updatedPost
            })
        })
        .catch( err => {
            res.status(500).send('Internal server error')
        })
})



module.exports = router