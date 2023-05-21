import { Router } from "express"
import { addMemberByContact, deactivateMember, getMemberById, getMemberByUserId, getMemberships, getUsersMemberships, updateMember } from "../../../services/teams"
const Types = require('mongoose').Types

export var membershipRoutes = Router()

membershipRoutes.get('/', async (req, res) => {

    try {


        let memberships = []
        // By default we will return the users memberships.
        // If a teamid is provided then we return team members
        if (req.query.teamid) {
            let teamId = new Types.ObjectId(req.query.teamid)
            memberships = await getMemberships(teamId)
            if (memberships.length == 0) {
                return res.status(404).send('Team does not exist')
            }

            // Make sure user is on the team
            let foundUser = memberships.find((member) => (String(member.user) == String(req.userId)))
            if (!foundUser) {
                return res.status(401).send('Unauthorized request')
            }
        }
        else {
            memberships = await getUsersMemberships(req.userId)
        }
        res.json({
            success: true,
            data: memberships
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



membershipRoutes.post('/', async (req, res) => {
    try {
        let member = await getMemberByUserId(req.body.team,req.userId)
        if (!member || !member.owner) {
            return res.status(401).send('Only team owners can add members')
        }
        
        let newMember = await addMemberByContact(req.body.team,member,
            req.body.name, 
            req.body.contacts[0].contact,
            req.body.contacts[0].contactType)
        res.status(200).send({
            success: true,
            data: newMember
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})

membershipRoutes.get('/:id', (req, res) => {
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

membershipRoutes.put('/:id', async (req, res) => {

    try {
        let update = req.body
        let memberid = new Types.ObjectId(req.params.id)
        let authorized = false
        // Authorization requirements for updating (1 of 2 conditions):
        // 1. The user is an owner and the membership is part of the team
        let member = await getMemberById(memberid)
        let usersMembership = await getMemberByUserId(member.team, req.userId)
        if (usersMembership?.owner) {
            authorized = true
        }

        // 2. This is the user's membership and they are active
        if (String(member.user) == String(req.userId)) {
            authorized = true
        }
        if (!update.user) {
            update.user = null
        }

        if (update.owner) {
            if (!usersMembership?.owner) {
                authorized = false
            }
        }


        if (authorized) {
            let membership = await updateMember(memberid, update)
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
})

membershipRoutes.delete('/:id', async (req, res) => {
    try {
        let memberid = new Types.ObjectId(req.params.id)

        let authorized = false
        // Authorization requirements for updating (1 of 2 conditions):
        // 1. The user is an owner and the membership is part of the team
        let member = await getMemberById(memberid)
        let usersMembership = await getMemberByUserId(member.team, req.userId)
        if (usersMembership?.owner) {
            authorized = true
        }

        if (authorized) {
            let membership = await deactivateMember(memberid)
            res.json({
                success: true,
                data: membership
            })
        } else {
            return res.json({
                success: false,
                error: 'Unauthorized: You are not a team owner',
                data: {}
            })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')    
    }
})
