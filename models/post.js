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
    },
    deleted: {
        type: Boolean,
        default: false
    },
    blocks: [
        {
            title: String,
            text: String,
            list: [String]
        }
    ]

})
const Post = mongoose.model('post',postSchema)
postSchema.index({  user: 1,created: 1})


module.exports = { Post }