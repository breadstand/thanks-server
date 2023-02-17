import { createHash } from 'crypto';
import { Router } from 'express'
import { User } from '../../../models/user';
import { UserObject } from '../../../models/user';
import { assignUserToMembersByContact } from '../../../services/teams';
import { sendCodeToVerifyContact, verifyCode } from '../../../services/users'

const jwt = require('jsonwebtoken');

export var apiRootRoutes = Router()


apiRootRoutes.get('/',(req,res) => {
    res.send('From API routes')  
})

apiRootRoutes.post('/register', (req,res) =>{
    // Don't allow creating if the user already exists
    let userData = req.body;
    let user = new UserObject(userData)
    
    user.password = createHash('sha256')
        .update(user.password)
        .digest('hex');

    user.save((error:any, registeredUser:User) => {
        if (error) {
            console.log(error)
        } else {
            console.log(registeredUser)
            let payload = {subject: registeredUser._id }
            let token = jwt.sign(payload,process.env.JWOTKEY)
            registeredUser.password = ''
            res.status(200).send({
                token: token,
                user: registeredUser
            }) 
        }
    })
})

apiRootRoutes.post('/login', (req,res) => {
    let userData = req.body;
    userData.password = createHash('sha256')
    .update(userData.password)
    .digest('hex');


    UserObject.findOne({email: userData.email}, (error:any, user:User) => {
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
                user.password = ''
                res.status(200).send({
                    token: token,
                    user: user
                }) 
            }
        }
    })
})



apiRootRoutes.post('/send-code',async (req,res) => {
    try{
        let user = await sendCodeToVerifyContact(req.body.contact,req.body.contactType)
        console.log(user?.contacts)
        res.json({
            success: true
        })

    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


apiRootRoutes.post('/verify-code',async (req,res) => {
    try{
        let user = await verifyCode(req.body.contact,req.body.contactType,req.body.code)
        if (user) {
            await assignUserToMembersByContact(req.body.contact,req.body.contactType,user._id)

            let payload = {subject: user._id }
            user.password = ''
            res.json({
                success: true,
                token: jwt.sign(payload,process.env.JWOTKEY),
                data: user
            })
        } else { 
            res.json({
                success: false,
                error: "Invalid code",
                data: null 
            })
        }
    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})


