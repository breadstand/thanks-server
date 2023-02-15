import { Router } from "express"
import { HabitTrackerObject,HabitTracker } from "../../../models/habittracker"

export var habitTrackerRouters = Router()

habitTrackerRouters.get('/', (req, res) => {
    HabitTrackerObject.find({ user: req.userId })
        .sort({ title: 1 })
        .then( (trackers:HabitTracker[]) => {
            res.json({
                success: true,
                data: trackers
            })
        }).catch( (err:any) => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

habitTrackerRouters.post('/', (req, res) => {
    // We assume the body is an array of trackers
    // We might want to check this ** IMPORTANT **
    for (let i = 0; i < req.body.length; i++) {
        req.body[i].user = req.userId
    }

    HabitTrackerObject.insertMany(req.body)
        .then((trackers:HabitTracker[]) => {
            res.json({
                success: true,
                data: trackers
            })
        }).catch( (err:any) => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

habitTrackerRouters.put('/',(req,res) => {
        // We assume the body is an array of trackers
    // We might want to check this ** IMPORTANT **

    let promises = []
    for (let i = 0; i < req.body.length; i++) {
        let tracker = req.body[i]
        tracker.user = req.userId
        //console.log(tracker)
        let promise = HabitTrackerObject.findOneAndUpdate(
                { _id: tracker._id,user: req.userId},tracker,{new: true,upsert: true}).exec()
        promises.push(promise)
    }

    Promise.all(promises)
        .then((trackers) => {
            res.json({
                success: true,
                data: trackers
            })
        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

