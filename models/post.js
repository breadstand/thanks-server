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
    feelings: String,
    instructions: String,
    action_items: [String],
    choices: [String],
    choiceSelected: Number,
    unexpected: String,
    recast_situation: String,
    evidence: String,
    relabeled_evidence: String,
    recast_negative_beliefs: [String],
    recast_positive_beliefs: [String],
    recast_imagine: [String]
})
const Post = mongoose.model('post',postSchema)
postSchema.index({  user: 1,postDate: 1})


module.exports = { Post }