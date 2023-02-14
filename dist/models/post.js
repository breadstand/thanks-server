"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostObject = void 0;
const mongoose_1 = require("mongoose");
const mongoose = require('mongoose');
var imageSchema = require('../dist/models/image').imageSchema;
const postSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user'
    },
    category: String,
    title: String,
    mood: String,
    scale: Number,
    summary: String,
    body: String,
    image: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    current_situation: String,
    negative_beliefs: [String],
    preferred_beliefs: [String],
    preferred_feelings: String,
    preferred_thoughts: String,
    actionItems: [{
            action: String,
            complete: Boolean
        }],
});
exports.PostObject = mongoose.model('post', postSchema);
postSchema.index({ user: 1, lastUpdate: 1, category: 1 });
