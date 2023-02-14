"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HabitTrackerObject = void 0;
const mongoose_1 = require("mongoose");
const mongoose = require('mongoose');
const habitTrackerSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user'
    },
    title: String,
    dates: [String]
});
exports.HabitTrackerObject = mongoose.model('habit_tracker', habitTrackerSchema);
habitTrackerSchema.index({ user: 1 });
