import { model, ObjectId, Schema } from "mongoose";

export interface Team {
    _id: ObjectId
    created: Date,
    name: string,
    stripeCustomerId: string,
    active: boolean,
    months: number,
    lastpick: Date,
    lastbill: Date,
    trending: string[],
    members: number,
    sent: number,
    nudgeEnabled: boolean,
    nudgeDays: number,
    nudgeSubject: string,
    nudgeMessage: string,
    nudgeAgainDays: number,
    lastNudge: Date,
    image: ObjectId
}

const teamSchema = new Schema<Team>({
    created: {
        type: Date,
        default: Date.now
        },
    name: String,
    stripeCustomerId: String,
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
    nudgeSubject: String,
    nudgeMessage: String,
    nudgeAgainDays: {
        type: Number,
        default: 15
    },
    lastNudge: Date,
    image: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    }
});

export const TeamObject = model('team',teamSchema);

export interface TeamBounty {
    created: Date,
    team: ObjectId,    
    name: String,
    amount: Number,
    active: {
        type: Boolean,
        default: true
    }

}

const teamBountySchema = new Schema<TeamBounty>({
    created: {
        type: Date,
        default: Date.now
        },
    team: { 
        type: Schema.Types.ObjectId, 
        ref: 'team'
    },    
    name: String,
    amount: Number,
    active: {
        type: Boolean,
        default: true
    }
});

export const TeamBountyObject = model('team_bounty',teamBountySchema);
teamBountySchema.index({ "team": 1});

export interface TeamPrizes {
    created: Date,
    team: ObjectId
    url: string,
    name: string,
    description: string,
    price: number,
    awardedTo: ObjectId,
    awardedOn: Date,
    active: boolean,
    photo: ObjectId,
    draft: boolean
}


const teamPrizeSchema = new Schema<TeamPrizes>({
    created: {
        type: Date,
        default: Date.now
        },
    team: { type: Schema.Types.ObjectId, ref: 'team' },
    url: String,
    name: String,
    description: String,
    price: Number,
    awardedTo: { type: Schema.Types.ObjectId, ref: 'user' },
    awardedOn: Date,
    active: {
        type: Boolean,
        default: true
    },
    photo: { type: Schema.Types.ObjectId, ref: 'image' },
    draft: {
        type: Boolean,
        default: false
    }
});

export const TeamPrizeObject = model('prize',teamPrizeSchema);
teamPrizeSchema.index({ team: 1}); 
teamPrizeSchema.index({ team: 1, awardedto: 1}); 
