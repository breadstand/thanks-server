import { Router } from 'express'
import { User, UserObject } from '../../../models/user'
import { addContact, removeContact, verifyUserContact } from '../../../services/users'
export var userRoutes = Router()

userRoutes.get('/:id',(req,res) => {
    UserObject.findById(req.userId)
        .then( user => {
        if (user) {
            user.password = ''
        }
        res.json({
            success: true,
            data: user
        })

    }).catch(err => {
        console.log(err)
        res.status(500).send('Internal server error')
    })
})

userRoutes.put('/:id',(req,res) => {

    let options = {
        returnDocument: 'after',
    }
    UserObject.findByIdAndUpdate(req.userId,req.body,{
        returnDocument: 'after'})
        .then( user => {
            if (user) {
                user.password = ''
            }    
            res.json({
                success: true,
                data: user
            })
        })
        .catch( err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})


userRoutes.post('/:id/add-contact', async (req,res) =>{
    try{
        let user:User|null = await UserObject.findById(req.userId)
        if (!user) {
            throw "Invalid user"
        }

        user = await addContact(user,req.body.contact,
                req.body.contactType)
        if (user) {
            console.log(user)
            user.password = ''
            res.json({
                success: true,
                data: user
            })
        } else { 
            res.json({
                success: false,
                error: "Invalid user",
                data: null 
            })
        }
    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }})




userRoutes.put('/:id/verify-contact', async (req,res) =>{
    try{
        let user:User|null = await UserObject.findById(req.userId)
        if (!user) {
            throw "Invalid user"
        }
        user = await verifyUserContact(user,
                req.body.contact,
                req.body.contactType,
                req.body.code)
        if (user) {
            user.password = ''
            res.json({
                success: true,
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
    }})


userRoutes.put('/:id/remove-contact', async (req,res) =>{
    try{
        console.log('user/remove-contact')
        let user:User|null = await UserObject.findById(req.userId)
        if (!user) {
            throw "Invalid user"
        }

        await removeContact(user,req.body.contact,
                req.body.contactType)
        console.log(user)
        user.password = ''
        res.json({
            success: true,
            data: user
        })
    } catch(err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }})


