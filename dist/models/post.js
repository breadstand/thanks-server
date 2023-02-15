"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostObject = void 0;
const mongoose_1 = require("mongoose");
const mongoose = require('mongoose');
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
    summary: String,
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
    currentSituation: String,
    negativeBeliefs: [String],
    preferredBeliefs: [String],
    preferredFeelings: String,
    preferredThoughts: String,
    actionItems: [{
            action: String,
            complete: Boolean
        }],
});
exports.PostObject = (0, mongoose_1.model)('post', postSchema);
postSchema.index({ user: 1, lastUpdate: 1, category: 1 });
