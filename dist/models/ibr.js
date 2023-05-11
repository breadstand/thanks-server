"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdeaBountyRelationshipObject = void 0;
const mongoose_1 = require("mongoose");
const ideaBountyRelationshipSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    team: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'membership',
        required: true
    },
    approved: Date,
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'team',
        required: true
    },
});
exports.IdeaBountyRelationshipObject = (0, mongoose_1.model)('idea_bounty_relationship', ideaBountyRelationshipSchema);
ideaBountyRelationshipSchema.index({ idea: 1 });
ideaBountyRelationshipSchema.index({ bounty: 1 });
