const express = require('express')
const router = express.Router()
const Post = require('../../../models/post').Post
const User = require('../../../models/user').User
const {safeCopy} = require('../../../utils/utils')


router.get('/',(req,res) => {

    let limit = 10;

    Post.find({user: req.userId, draft: false})
        .sort({created: 'desc'})
        .limit(limit)
        .then( posts => {
        res.json({ success: true,
                data: posts
        })

    }).catch(err => {
        res.status(500).send('Internal server error')
    })
})



router.post('/',(req,res) => {

    let postData = safeCopy(req.body,
            ['summary',
            'title',
            'body',
            'postDate',
            'category',
            'image',
            'mood',
            'scale'])

    let post = new Post(postData)
    post.user = req.userId;
    post.save((error, savedPost) => {
        if (error) {
            console.log(error)
        } else {
            res.status(200).send({
                success: true,
                data: savedPost
            }) 
        }
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

router.post('/:id',(req,res) => {

    let postData = req.body;

    postUpdate = safeCopy(postData,['summary','title','choices','choiceSelected'])
    postUpdate._id = req.params.id
    postUpdate.user = req.userId;

    let options = {
        returnDocument: 'after',
    }
    Post.findByIdAndUpdate(req.params.id,postUpdate,options)
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