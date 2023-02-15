import { model, ObjectId, Schema } from "mongoose";

const mongoose = require('mongoose')

export interface Post {
    created: Date,
    lastUpdate: Date,
    user: ObjectId,
    category: string,
    title: string, 
    summary: string,
    mood: string, 
    image: ObjectId,
    draft: boolean,
    deleted: boolean,
    identity: string,
    intention: string,
    instructions: string,
    choices: string[],
    choiceSelected: number,
    unexpected: string,
    currentSituation: string, 
    negativeBeliefs: string[],  
    preferredBeliefs: string[],
    preferredFeelings: string, 
    preferredThoughts: string,
    actionItems: [{
        action: string,
        complete: boolean
    }],
}

const postSchema = new Schema<Post>({
    created: {
        type: Date,
        default: Date.now
        },
    lastUpdate: {
        type: Date,
        default: Date.now
        },    
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'user'
    },
    category: String,
    title: String, // Title (actually the choice from previous post)
    mood: String, // Mood as a String
    summary: String,
    image: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    },
    draft: {
        type: Boolean,
        default: false
    },
    deleted: {
        type: Boolean,
        default: false
    },
    identity: String,
    intention: String,
    instructions: String,
    choices: [String],
    choiceSelected: Number,
    unexpected: String,
    currentSituation: String, // New
    negativeBeliefs: [String],  
    preferredBeliefs: [String],
    preferredFeelings: String, 
    preferredThoughts: String,
    actionItems: [{
        action: String,
        complete: Boolean
    }],
})
export const PostObject = model('post',postSchema)
postSchema.index({  user: 1,lastUpdate: 1,category: 1})


   