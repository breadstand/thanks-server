import { ObjectId, Schema } from "mongoose";
import { Team } from "./team";
import { User } from "./user";
const mongoose = require('mongoose');

export interface Membership {
    _id: ObjectId
    team: ObjectId | Team,
    user: ObjectId | User | null,
    name: string,
    contacts: [{
        contact: string,
        contactType: string
    }],
    created: Date,
    lastUpdate: Date,
    details: string,
    sent: number,
    received: number,
    ideas: number,
    active: boolean,
    owner: boolean,
    image: ObjectId,
    verifyCode: string,
    wentTo: string,
    workedAt: string,
    livesIn: string,
    from: string
}


export interface UsersMembership extends Membership {
    team: Team,
}

export interface TeamMember extends Membership {
    user: User
}

const membershipSchema = new Schema<Membership>({
    team: { 
        type: Schema.Types.ObjectId, 
        ref: 'team'
    },
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'user'
    },
    name: String,
    contacts: [{
        contact: String,
        contactType: String
    }],
    created: {
        type: Date,
        default: Date.now
        },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    details: String,
    sent: {
        type: Number,
        default: 0
    },
    received: {
        type: Number,
        default: 0
    },
    ideas: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Boolean,
        default: false
    },
    image: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    },
    verifyCode: String,
    wentTo: String,
    workedAt: String,
    livesIn: String,
    from: String
});


export const MembershipObject = mongoose.model('membership',membershipSchema);
membershipSchema.index({ "team": 1});
membershipSchema.index({ "user": 1});
membershipSchema.index({ "contacts.contact": 1});

