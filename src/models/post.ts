import { model, ObjectId, Schema } from "mongoose";
import { Membership } from "./membership";
import { TeamPrize } from "./team";
import { Bounty } from "./bounty";


export interface ThanksSet {
    _id: ObjectId,
    created: Date,
    team: ObjectId,    
    startDate: Date,
    endDate: Date
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


export interface Post {
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
    bounty: ObjectId|Bounty,
    approved: boolean,
    prize: ObjectId | TeamPrize,
    active: boolean,
    postType: string
}

export interface PostDetailed extends Post {
    createdBy: Membership | null,
    thanksTo: Membership | null,
}



const postSchema = new Schema<Post>({
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
    bounty: { 
        type: Schema.Types.ObjectId, 
        ref: 'bounty', 
    },
    approved: {
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
});

export const PostObject = model('post',postSchema);
postSchema.index({createdBy: 1});
postSchema.index({thanksTo: 1});
postSchema.index({team: 1});
postSchema.index({created: 1});
postSchema.index({thanksFor: 1,winner: 1});
postSchema.index({team: 1,set: 1});

export class PickWinnersResults {
    start: Date = new Date()
    end: Date = new Date()
    monthsCovered = 0
    prizes: TeamPrize[] = []
    winningPosts: Post[] = []
    winningPostsWithPrizes: Post[] = []
    set: ThanksSet|undefined = undefined
    messages: string[] = []
}
