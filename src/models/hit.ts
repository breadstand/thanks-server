import { model, ObjectId, Schema } from "mongoose";
//var ValidationError = require('../models/error').ValidationError;

export interface Hit {
    created: Date,
    url: string,
    user: ObjectId
}

const hitSchema = new Schema<Hit>({
    created: {
        type: Date,
        default: Date.now
        },
    url: String,
    user: { type: Schema.Types.ObjectId, ref: 'user' }
});

export const Hit = model('hit',hitSchema);
hitSchema.index({ created: 1}); 
hitSchema.index({ created: 1,url: 1}); 

