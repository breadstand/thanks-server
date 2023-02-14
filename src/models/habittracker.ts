import { ObjectId, Schema } from "mongoose"

const mongoose = require('mongoose')

export interface HabitTracker {
    created: Date,
    updated: Date,
    user: ObjectId,
    title: string,
    dates: [string]
}


const habitTrackerSchema = new Schema<HabitTracker>({
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
export const HabitTrackerObject = mongoose.model('habit_tracker',habitTrackerSchema)
habitTrackerSchema.index({user: 1})

