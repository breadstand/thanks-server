const express = require('express')
const router = express.Router()
const User = require('../models/user').User
const mongoose = require('mongoose')
const db = "mongodb+srv://djohnson:V9hXjamp6gM3MqaE@cluster0.wwymlfc.mongodb.net/?retryWrites=true&w=majority"
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const Post = require('../models/post').Post
const safeCopy = require('../utils/utils').safeCopy
const posts = require('../services/posts');
const multer = require('multer')

const upload = multer()

let secretKey = "Iaeb18173k"

mongoose.connect(db,err => {
    if (err) {
        console.error('Error!' + err)
    } else {
        console.log('Connected to mongodb')
    }
})

function verifyToken(req,res,next) {
    if(!req.headers.authorization) {
        return res.status(401).send('Unauthorized request')
    }
    let token = req.headers.authorization.split(' ')[1]
    if (token === 'null') {
        return res.status(401).send('Unauthorized request')
    }
    let payload = jwt.verify(token,secretKey)
    if (!payload) {
        return res.status(401).send('Unauthorized request')
    }
    req.userId = payload.subject
    next()
}


router.get('/',(req,res) => {
    res.send('From API routes')  
})

router.post('/register', (req,res) =>{
    // Don't allow creating if the user already exists
    let userData = req.body;
    let user = new User(userData)
    
    user.password = crypto.createHash('sha256')
        .update(user.password)
        .digest('hex');

    user.save((error, registeredUser) => {
        if (error) {
            console.log(error)
        } else {
            console.log(registeredUser)
            let payload = {subject: registeredUser._id }
            let token = jwt.sign(payload,secretKey)
            registeredUser.password = undefined
            res.status(200).send({
                token: token,
                user: registeredUser
            }) 
        }
    })
})

router.post('/login', (req,res) => {
    let userData = req.body;
    userData.password = crypto.createHash('sha256')
    .update(userData.password)
    .digest('hex');


    User.findOne({email: userData.email}, (error, user) => {
        if (error) {
            console.log(error)
        } else {
            if (!user) {
                res.status(401).send('Invalid email')
            } else 
            if (user.password !== userData.password) {
                res.status(401).send('Invalid password')
            } else {
                let payload = {subject: user._id }
                let token = jwt.sign(payload,secretKey)
                user.password = undefined
                res.status(200).send({
                    token: token,
                    user: user
                }) 
            }
        }
    })
})


/*
router.post('/posts/add', (req,res) => {

});
*/
router.get('/posts',verifyToken,(req,res) => {

    let limit = 30;

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

router.post('/posts',verifyToken,(req,res) => {

    let postData = safeCopy(req.body,['summary','title','body','postDate'])

    let post = new Post(postData)
    post.user = req.userId;
    console.log('Before saving:',post)
    post.save((error, savedPost) => {
        if (error) {
            console.log(error)
        } else {
            console.log(savedPost);
            res.status(200).send({
                success: true,
                data: savedPost
            }) 
        }
    })
})

router.post('/posts/:id',verifyToken,(req,res) => {

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

router.post('/posts/:postid/image',verifyToken,
    upload.single('image'), 
    // We should verify the owner here with verifyToken
    async (req, res) => {
    try {
        console.log('Post to image')
        console.log(req.file)
      if (req.file) {
        post = await posts.setPostImage(req.params.postid,req.file);
        return res.send(post)
      }
      return res.send(post)
    } catch (e) {
      console.log(e);
      return res.status(500).send('Server error');
    };
  });


router.get('/users/:id',verifyToken,(req,res) => {

    User.findById(req.userId)
        .then( user => {
        user.password = undefined;
        res.json(user)

    }).catch(err => {
        console.log(err)
        res.status(500).send('Internal server error')
    })
})


router.post('/users/:id',verifyToken,(req,res) => {

    let userUpdate = safeCopy(req.body,['choices','choiceSelected','choiceStarted'])

    let options = {
        returnDocument: 'after',
    }
    User.findByIdAndUpdate(req.userId,userUpdate,options)
        .then( updatedUser => {
            updatedUser.password = undefined;
            res.status(200).json(updatedUser)
        })
        .catch( err => {
            res.status(500).send('Internal server error')
        })
})

module.exports = router