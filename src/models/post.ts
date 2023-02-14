import { ObjectId, Schema } from "mongoose";

const mongoose = require('mongoose')
var imageSchema = require('../dist/models/image').imageSchema;

export interface Post {
    created: Date,
    lastUpdate: Date,
    user: ObjectId,
    category: string,
    title: string, 
    mood: string, 
    scale: number, 
    summary: string, 
    body: string,
    image: ObjectId,
    draft: boolean,
    deleted: boolean,
    identity: string,
    intention: string,
    instructions: string,
    choices: string[],
    choiceSelected: number,
    unexpected: string,
    current_situation: string, 
    negative_beliefs: string[],  
    preferred_beliefs: string[],
    preferred_feelings: string, 
    preferred_thoughts: string,
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
    scale: Number, // Feeling on a scale of 1-10
    summary: String, // Summary of what happened after
    body: String,
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
    current_situation: String, // New
    negative_beliefs: [String],  
    preferred_beliefs: [String],
    preferred_feelings: String, 
    preferred_thoughts: String,
    actionItems: [{
        action: String,
        complete: Boolean
    }],
})
export const PostObject = mongoose.model('post',postSchema)
postSchema.index({  user: 1,lastUpdate: 1,category: 1})


   