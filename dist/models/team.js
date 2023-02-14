"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamPrizeObject = exports.TeamBountyObject = exports.TeamObject = void 0;
const mongoose_1 = require("mongoose");
const teamSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    name: String,
    stripeCustomerId: String,
    active: {
        type: Boolean,
        default: true
    },
    months: {
        type: Number,
        default: 1
    },
    lastpick: Date,
    lastbill: Date,
    trending: [String],
    members: Number,
    sent: {
        type: Number,
        default: 0
    },
    nudgeEnabled: {
        type: Boolean,
        default: true
    },
    nudgeDays: {
        type: Number,
        default: 15
    },
    nudgeSubject: String,
    nudgeMessage: String,
    nudgeAgainDays: {
        type: Number,
        default: 15
    },
    lastNudge: Date,
    image: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'image'
    }
});
exports.TeamObject = (0, mongoose_1.model)('team', teamSchema);
const teamBountySchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    team: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'team'
    },
    name: String,
    amount: Number,
    active: {
        type: Boolean,
        default: true
    }
});
exports.TeamBountyObject = (0, mongoose_1.model)('team_bounty', teamBountySchema);
teamBountySchema.index({ "team": 1 });
const teamPrizeSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    team: { type: mongoose_1.Schema.Types.ObjectId, ref: 'team' },
    url: String,
    name: String,
    description: String,
    price: Number,
    awardedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user' },
    awardedOn: Date,
    active: {
        type: Boolean,
        default: true
    },
    photo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'image' },
    draft: {
        type: Boolean,
        default: false
    }
});
exports.TeamPrizeObject = (0, mongoose_1.model)('prize', teamPrizeSchema);
teamPrizeSchema.index({ team: 1 });
teamPrizeSchema.index({ team: 1, awardedto: 1 });
