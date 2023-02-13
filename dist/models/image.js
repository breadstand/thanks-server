"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoredImageObject = void 0;
const mongoose_1 = require("mongoose");
const imageSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user'
    },
    key: String,
    mimetype: String,
    originalname: String,
    thumbnail: {
        mimetype: String,
    },
    width: Number,
    height: Number
});
exports.StoredImageObject = (0, mongoose_1.model)('image', imageSchema);
imageSchema.index({ created: 1, user: 1 });
