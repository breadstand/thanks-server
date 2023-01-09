/*
export class HabitTracker {
    title: string = 'Habit Tracker'
    dates:string[] = []
}
*/
const mongoose = require('mongoose')

const Schema = mongoose.Schema
const habitTrackerSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
        },
    updated: {
        type: Date,
        default: Date.now
        },    
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'user'
    },
    title: String,
    dates: [String]
})
const HabitTracker = mongoose.model('habit_tracker',habitTrackerSchema)
habitTrackerSchema.index({user: 1})


module.exports = { HabitTracker }