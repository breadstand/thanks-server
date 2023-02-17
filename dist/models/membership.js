"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipObject = void 0;
const mongoose_1 = require("mongoose");
const mongoose = require('mongoose');
const membershipSchema = new mongoose_1.Schema({
    team: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'team'
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user'
    },
    name: String,
    contacts: [{
            contact: String,
            contactType: String
        }],
    created: {
        type: Date,
        default: Date.now
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    details: String,
    sent: {
        type: Number,
        default: 0
    },
    received: {
        type: Number,
        default: 0
    },
    ideas: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Boolean,
        default: false
    },
    image: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'image'
    },
    verifyCode: String,
    wentTo: String,
    workedAt: String,
    livesIn: String,
    from: String
});
exports.MembershipObject = mongoose.model('membership', membershipSchema);
membershipSchema.index({ "team": 1 });
membershipSchema.index({ "user": 1 });
membershipSchema.index({ "contacts.contact": 1 });
