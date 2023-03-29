import { model, ObjectId, Schema } from "mongoose";
import { Membership } from "./membership";
import { TeamPrize } from "./team";


export interface ThanksSet {
    _id: ObjectId,
    created: Date,
    team: ObjectId,    
    startDate: Date,
    endDate: Date,
}

const thanksSetSchema = new Schema<ThanksSet>({
    created: {
        type: Date,
        default: Date.now
        },
    team: { 
        type: Schema.Types.ObjectId, 
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
export const ThanksSetObject = model('thanks_set',thanksSetSchema);


export interface ThanksPost {
    _id: ObjectId,
    created: Date,
    lastUpdate: Date,
    createdBy: ObjectId | Membership | null,
    thanksTo: ObjectId | Membership | null,
    team: ObjectId,
    thanksFor: String,
    idea: String,
    thanksSet: ObjectId,
    winner: boolean,
    prize: ObjectId | TeamPrize,
    active: boolean,
    postType: string,
    approvedBounties: ObjectId[]
}

export interface ThanksPostDetailed extends ThanksPost {
    createdBy: Membership | null,
    thanksTo: Membership | null,
}



const thanksPostSchema = new Schema<ThanksPost>({
    created: {
        type: Date,
        default: Date.now
        },
    lastUpdate: Date,
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'membership', 
        required: true
    },
    thanksTo: { type: Schema.Types.ObjectId, ref: 'membership' },
    team: { type: Schema.Types.ObjectId, ref: 'team', required: true},
    thanksFor: String,
    idea: String,
    thanksSet: { type: Schema.Types.ObjectId, ref: 'thanks_set' },
    winner: {
        type: Boolean,
        default: false
    },
    prize: { type: Schema.Types.ObjectId, ref: 'prize' },
    active: {
        type: Boolean,
        default: true
    },
    postType: {
        type: String,
        enum : ['thanks','idea'],
        default: 'thanks'
    },
    approvedBounties: [{
        type: Schema.Types.ObjectId, 
        ref: 'team_bounty'
    }]
});

export const ThanksPostObject = model('thanks_post',thanksPostSchema);
thanksPostSchema.index({createdBy: 1});
thanksPostSchema.index({thanksTo: 1});
thanksPostSchema.index({team: 1});
thanksPostSchema.index({created: 1});
thanksPostSchema.index({thanksFor: 1,winner: 1});
thanksPostSchema.index({team: 1,set: 1});

