import { model, ObjectId, Schema } from "mongoose";

export interface Bounty {
    createdBy: ObjectId,
    created: Date,
    team: ObjectId,    
    name: String,
    description: String,
    amount: Number,
    reward: String,
    active: {
        type: Boolean,
        default: true
    },
    ideas: [ObjectId]
}

const bountySchema = new Schema<Bounty>({
    created: {
        type: Date,
        default: Date.now
        },
    team: { 
        type: Schema.Types.ObjectId, 
        ref: 'team'
    },    
    createdBy: { 
        type: Schema.Types.ObjectId, 
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
        type: Schema.Types.ObjectId, 
        ref: 'post'
    }],    

});

export const BountyObject = model('bounty',bountySchema);
bountySchema.index({ "team": 1});



export interface BountyUpdate {
    name: String,
    description: String,
    amount: Number,
    reward: String,
    active: {
        type: Boolean,
        default: true
    },
    ideas: [ObjectId]
}