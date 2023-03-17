import { Router } from "express"
import { getMemberByUserId } from "../../../services/teams"
import { createThanks, getThanksPosts } from "../../../services/thanks"
const Types = require('mongoose').Types

export var thanksPostsRoutes = Router()


thanksPostsRoutes.get('/', async (req, res) => {

    try {
        // We only want authorized team members to see the posts
        let teamId = new Types.ObjectId(req.query.team)
        let member = await getMemberByUserId(teamId,req.userId)
        if (!member) {
            throw "User is not a member of team"
        }
        let thanksPosts = await getThanksPosts(teamId,null)
        res.json({
            success: true,
            data: thanksPosts
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})

thanksPostsRoutes.post('/', async (req, res) => {
    try {
        console.log('thanksPost')
        console.log(req.body)
        let thanksPost = await createThanks(req.body.team,req.body.createdBy,req.body.thanksTo,req.body.thanksFor)
        res.json({
            success: true,
            data: thanksPost
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})


