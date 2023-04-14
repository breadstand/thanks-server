
import { Schema, model, connect, ObjectId } from 'mongoose';
import { Types } from 'mongoose';
import mongoose = require("mongoose");

export interface UserContact {
    contact: string 
    contactType: string
    verified: boolean, 
    verifyCode: string|null, 
    verifyCodeExpiration: number|null,
    failed: number
}

export interface User {
    _id: ObjectId
    created: Date
    lastLogin: Date
    name: string
    password: string
    city: string
    contacts: UserContact[]
    active: boolean
    stripeCustomerId: string
    stripeSubscriptionId: string
    image: ObjectId
    access_token: string
    timeZone: string
    backgroundImage:  ObjectId
    backgroundImageWidth: number
    backgroundImageHeight: number,
    defaultTeam: ObjectId
}


const userSchema = new Schema<User>({
    created: {
        type: Date,
        default: Date.now
        },
    lastLogin: Date,
    name: String,
    password: String,
    city: String,
    contacts: [{
        contact: String, 
        contactType: String,
        verified: {
            type: Boolean,
            default: false
        }, 
        verifyCode: String, 
        verifyCodeExpiration: Number,
        failed: Number
    }],
    active: {
        type: Boolean,
        default: true
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    image: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    },
    access_token: {
        type: String,
        required: false,
        default: 'generate',
        validate: [
            function(this: User,token:string) {
                if (token == 'generate') {
                    this.access_token = '';
                }
                return true;
            }, 'Nothing'
        ]
    },
    timeZone: {
        type: String,
        default: 'America/New_York'
    },
    backgroundImage: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    },
    backgroundImageWidth: Number,
    backgroundImageHeight: Number, 
    defaultTeam: Schema.Types.ObjectId
});

export const UserObject = model('user',userSchema);

userSchema.index({ created: 1 });
userSchema.index({ "emails.email": 1 });
userSchema.index({ name: 1 });


export interface USPSAddress {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip5: string;
    zip4: string;
}

const uspsSchema = new Schema<USPSAddress>({
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip5: String,
    zip4: String
});


export interface Address {
    _id: ObjectId,
    created: Date,
    updated: Date,
    label: string,
    name: string,
    phone: string,
    organization: string,
    street: string,
    street2: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    uspsAddress: USPSAddress,
    verified: Date,
    error: string,
    active: boolean,
    user: ObjectId
}

export interface AddressFilter {
    active: boolean | null
}

const addressSchema = new Schema<Address>({
    created: {
        type: Date,
        default: Date.now
        },
    updated: {
        type: Date,
        default: Date.now
        },
    label: String,
    name: String,
    phone: String,
    organization: String,
    street: String,
    street2: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
        type: String,
        default: 'US'
    }, 
    uspsAddress: uspsSchema,
    verified: Date,
    error: String,
    active: {
        type: Boolean,
        default: true
    },
    user: Types.ObjectId,
});


export const AddressObject = model('user_address',addressSchema);
addressSchema.index({ user: 1 });
addressSchema.index({ subgroup: 1 });
addressSchema.index({ team: 1 });

let validContentTypes = ['image/png','image/jpeg'];

export interface VerifyCodeResult {
    success: boolean,
    error: string|null,
    data: User | null
}
