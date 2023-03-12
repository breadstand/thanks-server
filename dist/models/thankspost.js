"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThanksPostObject = exports.ThanksSetObject = void 0;
const mongoose_1 = require("mongoose");
const thanksSetSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    team: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'team',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    }
});
exports.ThanksSetObject = (0, mongoose_1.model)('thanks_set', thanksSetSchema);
const thanksPostSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    lastUpdate: Date,
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'membership',
        required: true
    },
    thanksTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'membership' },
    team: { type: mongoose_1.Schema.Types.ObjectId, ref: 'team', required: true },
    thanksFor: String,
    idea: String,
    thanksSet: { type: mongoose_1.Schema.Types.ObjectId, ref: 'thanks_set' },
    winner: {
        type: Boolean,
        default: false
    },
    prize: { type: mongoose_1.Schema.Types.ObjectId, ref: 'prize' },
    active: {
        type: Boolean,
        default: true
    },
    postType: {
        type: String,
        enum: ['thanks', 'idea'],
        default: 'thanks'
    },
});
exports.ThanksPostObject = (0, mongoose_1.model)('thanks_post', thanksPostSchema);
thanksPostSchema.index({ createdBy: 1 });
thanksPostSchema.index({ thanksTo: 1 });
thanksPostSchema.index({ team: 1 });
thanksPostSchema.index({ created: 1 });
thanksPostSchema.index({ thanksFor: 1, winner: 1 });
thanksPostSchema.index({ team: 1, set: 1 });
