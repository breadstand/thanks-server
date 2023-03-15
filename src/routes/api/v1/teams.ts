import { Router } from "express"
import { User } from "../../../models/user"
import { createTeam, getUsersMemberships } from "../../../services/teams"
import { getUser } from "../../../services/users"

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




