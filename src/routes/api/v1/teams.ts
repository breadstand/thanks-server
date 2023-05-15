import { Router } from "express"
import { TeamPrize } from "../../../models/team"
import { User } from "../../../models/user"
import { availablePrizes, createPrize, createTeam, deactivePrize, deleteTeam, getMemberByUserId, getTeam, getUsersMemberships, notifyTeam, updateTeam } from "../../../services/teams"
import { figureOutDateRange, pickTeamWinners } from "../../../services/posts"
import { getUser } from "../../../services/users"
import { ThanksSetObject } from "../../../models/post"
import { Bounty, BountyObject, BountyUpdate } from "../../../models/bounty"
import { truncateSync } from "fs"
const Types = require('mongoose').Types

export var teamRoutes = Router()

teamRoutes.get('/:teamid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let member = await getMemberByUserId(teamid, req.userId)

        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let team = await getTeam(teamid)
        res.json({
            success: true,
            error: '',
            data: team
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})



teamRoutes.post('/', async (req, res) => {
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


teamRoutes.put('/:teamid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let member = await getMemberByUserId(teamid, req.userId)
        let update = req.body

        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let team = await updateTeam(teamid,update)
        res.json({
            success: true,
            error: '',
            data: team
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})



teamRoutes.delete('/:teamid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let member = await getMemberByUserId(teamid, req.userId)

        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let team = await deleteTeam(teamid)
        res.json({
            success: true,
            error: ''
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})



teamRoutes.get('/:id/prizes', async (req, res) => {
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



teamRoutes.post('/:teamid/prizes', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let prize: TeamPrize = req.body
        let missingFields: string[] = []
        if (!prize.team) { missingFields.push('team') }
        if (!prize.createdBy) { missingFields.push('createdBy') }
        if (!prize.name) { missingFields.push('name') }

        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: ' + missingFields.join(', '),
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

teamRoutes.post('/:teamid/pick-winners', async (req, res) => {
    try {
        let dryRun = true
        if (!req.body.dryRun) {
            dryRun = false
        }
        console.log('dryRun',dryRun)
        let teamid = new Types.ObjectId(req.params.teamid)
        // Check the user is a team owner

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let results = await pickTeamWinners(teamid, 0, dryRun)
        res.json({
            success: true,
            error: '',
            data: results
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.delete('/:teamid/prizes/:prizeid', async (req, res) => {
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



teamRoutes.get('/:id/bounties', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the prizes
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership) {
            return res.status(401).send("Unauthorized: You are not a member of this team.")
        }
        let bounties = await BountyObject.find({team: teamid, active: true})
            .populate('createdBy')
            .populate('ideas')
            .populate('ideas.createdBy')
            .sort({name: 1})
        res.json({
            success: true,
            error: '',
            data: bounties
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.post('/:teamid/bounties', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let bounty = new BountyObject(req.body)
        let missingFields: string[] = []
        if (!bounty.team) { missingFields.push('team') }
        if (!bounty.createdBy) { missingFields.push('createdBy') }
        if (!bounty.name) { missingFields.push('name') }

        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: ' + missingFields.join(', '),
                data: bounty
            })
        }

        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty posted to the wrong URL")
        }

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }



        await bounty.save()
        res.json({
            success: true,
            error: '',
            data: bounty
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



teamRoutes.put('/:teamid/bounties/:bountyid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let bountyid = new Types.ObjectId(req.params.bountyid)
        let update: BountyUpdate = req.body

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let bounty = await BountyObject.findById(bountyid)
        if (!bounty) {
            return res.status(404).send("Cannot find that bounty")
        }

        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty posted to the wrong URL")
        }

        let updatedBounty = await BountyObject.findByIdAndUpdate(bountyid, {$set: update},{new: true})
        res.json({
            success: true,
            error: '',
            data: updatedBounty
        })


    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.put('/:teamid/bounties/:bountyid/remindMembers', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let bountyid = new Types.ObjectId(req.params.bountyid)

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let bounty = await BountyObject.findById(bountyid)
        if (!bounty) {
            return res.status(404).send("No such bounty")
        }

        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty does not belong to team")
        }
        let subject = 'Bounty Reminder!'
        let body = `${usersMembership.name} is looking for ideas for: ${bounty.name}. Do you have any? Go to https://thanks-a919c.web.app/ to submit some ideas.`

        notifyTeam(teamid,subject,body)

        res.json({
            success: true,
            error: ''
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})




teamRoutes.get('/:id/sets', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the sets
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership) {
            return res.status(401).send('You are not a member of this team.')
        }

        let sets = await ThanksSetObject.find({team: teamid})
        res.json({
            success: true,
            error: '',
            data: sets
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.get('/:id/getNextSet', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the sets
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send('You are not an owner of this team.')
        }

        let team = await getTeam(teamid)
        if (!team) {
            return res.status(404).send('Team not found')
        }
        let dateRange = await figureOutDateRange(team)

        let sets = await ThanksSetObject.find({team: teamid})
        res.json({
            success: true,
            error: '',
            data: [
                {
                    _id: '',
                    created: new Date(),
                    team: teamid,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }
            ]
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.get('/:id/testPickingWinners', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the sets
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send('You are not an owner of this team.')
        }

        let team = await getTeam(teamid)
        if (!team) {
            return res.status(404).send('Team not found')
        }
        let dateRange = await figureOutDateRange(team)

        
        res.json({
            success: true,
            error: '',
            data: [
                {
                    _id: '',
                    created: new Date(),
                    team: teamid,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }
            ]
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})