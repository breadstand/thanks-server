import { Router } from 'express'
import { UserObject } from '../../../models/user'
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
    UserObject.findByIdAndUpdate(req.userId,req.body,options)
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
