const mongoose = require('mongoose')
var imageSchema = require('../models/image').imageSchema;

const Schema = mongoose.Schema
const postSchema = new Schema({
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
    recast_situation: String, // Deprecated
    evidence: String, // Deprecated
    recast_imagine: [String], // Deprecated
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
const Post = mongoose.model('post',postSchema)
postSchema.index({  user: 1,lastUpdate: 1,category: 1})


module.exports = { Post }