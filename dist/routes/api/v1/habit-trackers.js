"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.habitTrackerRouters = void 0;
const express_1 = require("express");
const habittracker_1 = require("../../../models/habittracker");
exports.habitTrackerRouters = (0, express_1.Router)();
exports.habitTrackerRouters.get('/', (req, res) => {
    habittracker_1.HabitTrackerObject.find({ user: req.userId })
        .sort({ title: 1 })
        .then((trackers) => {
        res.json({
            success: true,
            data: trackers
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.habitTrackerRouters.post('/', (req, res) => {
    // We assume the body is an array of trackers
    // We might want to check this ** IMPORTANT **
    for (let i = 0; i < req.body.length; i++) {
        req.body[i].user = req.userId;
    }
    habittracker_1.HabitTrackerObject.insertMany(req.body)
        .then((trackers) => {
        res.json({
            success: true,
            data: trackers
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.habitTrackerRouters.put('/', (req, res) => {
    // We assume the body is an array of trackers
    // We might want to check this ** IMPORTANT **
    let promises = [];
    for (let i = 0; i < req.body.length; i++) {
        let tracker = req.body[i];
        tracker.user = req.userId;
        //console.log(tracker)
        let promise = habittracker_1.HabitTrackerObject.findOneAndUpdate({ _id: tracker._id, user: req.userId }, tracker, { new: true, upsert: true }).exec();
        promises.push(promise);
    }
    Promise.all(promises)
        .then((trackers) => {
        res.json({
            success: true,
            data: trackers
        });
    }).catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
