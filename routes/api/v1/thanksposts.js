const express = require('express')
const router = express.Router()
const { safeCopy } = require('../../../utils/utils')
const thanks = require('../../../services/thanks')
const teams = require('../../../services/teams')


router.get('/', async (req, res) => {

    try {
        // We only want authorized team members to see the posts
        let member = await teams.getMemberByUserId(req.query.team,req.userId)
        if (!member) {
            throw "User is not a member of team"
        }
        let thanksPosts = await thanks.getThanksPosts(req.query.team)
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

router.post('/', async (req, res) => {
    try {
        console.log(req.body)
        let thanksPost = await thanks.createThanks(req.body.team,req.body.createdBy,req.body.thanksTo,req.body.thanksFor)
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



module.exports = router