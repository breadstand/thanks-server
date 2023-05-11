"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BountyObject = void 0;
const mongoose_1 = require("mongoose");
const bountySchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    team: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'team'
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'membership'
    },
    name: String,
    description: String,
    amount: Number,
    reward: String,
    active: {
        type: Boolean,
        default: true
    },
    ideas: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'post'
        }],
});
exports.BountyObject = (0, mongoose_1.model)('bounty', bountySchema);
bountySchema.index({ "team": 1 });
