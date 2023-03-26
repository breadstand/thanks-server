import { Router } from "express"
import { TeamPrize } from "../../../models/team"
import { User } from "../../../models/user"
import { availablePrizes, createPrize, createTeam, deactivePrize, getMemberByUserId, getUsersMemberships } from "../../../services/teams"
import { pickTeamWinners } from "../../../services/thanks"
import { getUser } from "../../../services/users"
const Types = require('mongoose').Types

export var teamRoutes = Router()

teamRoutes.get('/',(req,res) => {
    console.log('Not implemented yet')
    res.status(500).send('Internal server error')
})



teamRoutes.post('/',async (req,res) => {
    try {
        let user = await getUser(req.userId)
        if (!user) {
            return res.json({
                success: false,
                error: "It looks like you don't exist?",
                data: {}
            })
        }

        var usersteams = await getUsersMemberships(user._id);
        if (usersteams.length >= 50) {
            return res.json({
                success: false,
                error: 'You appear to be on too many teams.',
                data: {}
            })
        }
    
        let results = await createTeam(user as User)
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


teamRoutes.get('/:id/prizes', async (req,res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the prizes
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership) {
            return res.json({
                success: false,
                error: "Unauthorized: You are not a member of this team.",
                data: []
            })
        }


        let prizes = await availablePrizes(teamid)
        console.log(prizes)
        res.json({
            success: true,
            error: '',
            data: prizes
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



teamRoutes.post('/:teamid/prizes',async (req,res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let prize:TeamPrize = req.body
        let missingFields:string[] = []
        if (!prize.team) { missingFields.push('team')}
        if (!prize.createdBy) { missingFields.push('createdBy')}
        if (!prize.name) { missingFields.push('name')}

        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: '+missingFields.join(', '),
                data: prize
            })
        }

        if (String(prize.team) != String(teamid)) {
            return res.json({
                success: false,
                error: `Team: ${prize.team} does not match url team: ${teamid}`,
                data: prize
            })
        }

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.json({
                success: false,
                error: 'You are not a team owner',
                data: prize
            })
        }

        let savedPrize = await createPrize(prize)
        res.json({
            success: true,
            error: '',
            data: savedPrize
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})

teamRoutes.get('/:teamid/pick-winners', async (req,res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        // Check the user is a team owner
    
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let set = await pickTeamWinners(teamid,0)
        res.json({
            success: true,
            error: '',
            data: set
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.delete('/:teamid/prizes/:prizeid',async (req,res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let prizeid = new Types.ObjectId(req.params.prizeid)

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        await deactivePrize(prizeid)
        res.json({
            success: true,
            error: '',
            data: {}
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})
