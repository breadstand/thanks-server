const express = require('express')
const router = express.Router()
const { HabitTracker } = require('../../../models/habittracker')


router.get('/', (req, res) => {
    HabitTracker.find({ user: req.userId })
        .sort({ title: 1 })
        .then(trackers => {
            res.json({
                success: true,
                data: trackers
            })
        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

router.post('/', (req, res) => {
    // We assume the body is an array of trackers
    // We might want to check this ** IMPORTANT **
    for (i = 0; i < req.body.length; i++) {
        req.body[i].user = req.userId
    }

    HabitTracker.insertMany(req.body)
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

router.put('/',(req,res) => {
        // We assume the body is an array of trackers
    // We might want to check this ** IMPORTANT **

    let promises = []
    for (i = 0; i < req.body.length; i++) {
        let tracker = req.body[0]
        let promise = HabitTracker.findOneAndUpdate(
                { _id: tracker._id,user: req.userId},tracker,{new: true}).exec()
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


module.exports = router