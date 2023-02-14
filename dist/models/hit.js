"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hit = void 0;
const mongoose_1 = require("mongoose");
const hitSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    url: String,
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user' }
});
exports.Hit = (0, mongoose_1.model)('hit', hitSchema);
hitSchema.index({ created: 1 });
hitSchema.index({ created: 1, url: 1 });
