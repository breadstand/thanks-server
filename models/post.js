const mongoose = require('mongoose')
var imageSchema = require('../models/image').imageSchema;

const Schema = mongoose.Schema
const postSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
        },
    postDate: {
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
        ref: 'user'
    },
    draft: {
        type: Boolean,
        default: false
    }

})
const Post = mongoose.model('post',postSchema)
postSchema.index({ created:1, user: 1})


module.exports = { Post }