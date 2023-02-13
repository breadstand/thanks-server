const express = require('express')
const router = express.Router()
const {safeCopy} = require('../../../utils/utils')
const users = require('../../../dist/services/users')


router.get('/',(req,res) => {
    console.log('Not implemented yet')
    res.status(500).send('Internal server error')
})



router.post('/',async (req,res) => {
    try {
        let user = await users.getUser(req.userId)
        let results = await teams.createTeam(user)
        let team = results[0]

        res.json({
            success: true,
            data: team
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
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