"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamPrizeObject = exports.TeamObject = void 0;
const mongoose_1 = require("mongoose");
const teamSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    name: String,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    pricingPlan: String,
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
    nudgeSubject: {
        type: String,
        default: ''
    },
    nudgeMessage: {
        type: String,
        default: ''
    },
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
const teamPrizeSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'membership' },
    team: { type: mongoose_1.Schema.Types.ObjectId, ref: 'team' },
    url: String,
    name: String,
    description: String,
    price: Number,
    awardedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'membership' },
    awardedOn: Date,
    active: {
        type: Boolean,
        default: true
    },
    draft: {
        type: Boolean,
        default: false
    },
    image: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'image'
    },
    imageWidth: Number,
    imageHeight: Number,
});
exports.TeamPrizeObject = (0, mongoose_1.model)('prize', teamPrizeSchema);
teamPrizeSchema.index({ team: 1 });
teamPrizeSchema.index({ team: 1, awardedto: 1 });
