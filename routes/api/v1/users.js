const { LexModelBuildingService } = require('aws-sdk')
const express = require('express')
const router = express.Router()
const User = require('../../../models/user').User
const {safeCopy} = require('../../../utils/utils')

router.get('/:id',(req,res) => {

    User.findById(req.userId)
        .then( user => {
        user.password = undefined;
        res.json(user)

    }).catch(err => {
        console.log(err)
        res.status(500).send('Internal server error')
    })
})


router.put('/:id',(req,res) => {

    let userUpdate = safeCopy(req.body,
            ['name','city','backgroundImage',
            'backgroundImageWidth','backgroundImageHeight'])

    let options = {
        returnDocument: 'after',
    }
    User.findByIdAndUpdate(req.userId,userUpdate,options)
        .then( updatedUser => {
            updatedUser.password = undefined;
            res.status(200).json(updatedUser)
        })
        .catch( err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

module.exports = router