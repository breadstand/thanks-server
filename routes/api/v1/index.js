const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const safeCopy = require('../../../utils/utils').safeCopy
//const User = require('../../../models/user').User;
//const users = require('../../../services/users');
const UserObject = require('../../../dist/models/user').UserObject;
const users = require('../../../dist/services/users');



router.get('/',(req,res) => {
    res.send('From API routes')  
})

router.post('/register', (req,res) =>{
    // Don't allow creating if the user already exists
    let userData = req.body;
    let user = new UserObject(userData)
    
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


    UserObject.findOne({email: userData.email}, (error, user) => {
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



router.post('/send-email-code',async (req,res) => {
    try{
        let user = await users.sendCodeToVerifyEmail(req.body.email)
        res.json({
            success: true
        })

    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})


router.post('/send-phone-code',async (req,res) => {
    try{
        let user = await users.sendCodeToVerifyPhone(req.body.phone)
        console.log(user)
        res.json({
            success: true
        })

    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})


router.post('/verify-code',async (req,res) => {
    try{
        let email = req.body.email;
        let phone = req.body.phone;
        let code = req.body.code;
        let result = await users.verifyCode(email,phone,code)
        if (result.data) {
            let user = result.data._id // user is in result.data
            let payload = {subject: user._id }
            result.token = jwt.sign(payload,process.env.JWOTKEY)
            result.data.password = undefined
            res.status(200).send(result)     
        } else {
            res.json(result)
        }
    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})


module.exports = router