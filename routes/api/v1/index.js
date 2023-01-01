const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const safeCopy = require('../../../utils/utils').safeCopy
const User = require('../../../models/user').User


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
            let token = jwt.sign(payload,process.env.JWOTKEY)
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
                let token = jwt.sign(payload,process.env.JWOTKEY)
                user.password = undefined
                res.status(200).send({
                    token: token,
                    user: user
                }) 
            }
        }
    })
})

module.exports = router