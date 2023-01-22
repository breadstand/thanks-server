const express = require('express')
const router = express.Router()
const Membership = require('../../../models/membership').Membership
const User = require('../../../models/user').User
const {safeCopy} = require('../../../utils/utils')
const teams = require('../../../services/teams')
const users = require('../../../services/users')
const { UserInstance } = require('twilio/lib/rest/conversations/v1/user')

router.get('/', async (req,res) => {

    try {
        let memberships = []
        // By default we will return the users memberships.
        // If a teamid is provided then we return team members
        if (req.query.teamid) {
            memberships = await teams.getMemberships(req.query.teamid) 
            // Make sure user is on the team
            let foundUser = memberships.find( (member) => {
                console.log(member.user,req.userId,member.user==req.userId)
                if (member.user == req.userId) {
                    return member
                }
            })
            if (!foundUser) {
                res.status(401).send('Unauthorized request')
            }
        }
        else {
            memberships = await teams.getUsersMemberships(req.userId)
            // If the user doesn't have any teams, create one
            if (memberships.length == 0) {
                let user = await users.getUser(req.userId)
                let results = await teams.createTeam(user)
                let team = results[0]
                let membership = results[1]
                memberships = [membership]
            }
        }
        res.json({ success: true,
            data: memberships
        })            
    }
    catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }


})



router.post('/',(req,res) => {
    res.status(500).send('Internal server error')
/*
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
    */
})

router.get('/:id',(req,res) => {
    res.status(500).send('Internal server error')
    /*
    Post.findById(req.params.id)
    .then( post => {
        res.json({
            success: true,
            data: post
        })
    }).catch(err => {
        console.log(err)
        res.status(500).send('Internal server error')
    })*/
})

router.put('/:id',async (req,res) => {

    try {
        let update = req.body
        let memberid = req.params.id
        let authorized = false
        // Authorization requirements for updating (1 of 2 conditions):
        // 1. The user is an owner and the membership is part of the team
        let member = await teams.getMember(memberid)
        let usersMembership = await teams.getMemberByUserId(member.team,req.userId)
        if (usersMembership.owner) {
            authorized = true
        }

        // 2. This is the user's membership and they are active
        if (member.user == req.userId) {
            authorized = true
        }
        if (authorized) {
            let membership = await teams.updateMember(memberid,update)
            res.json({
                success: true,
                data: [membership]
            })
        } else {
            console.log('Unauthorized')
            res.status(401).send('User is not the member or is not a team owner')
        }
    }
    catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

    /*

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
        */
})



module.exports = router