
/*
const mongoose = require('mongoose')

const Schema = mongoose.Schema
const userSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
        },
    name: String,
    email: String,
    password: String,
})
const User = mongoose.model('user',userSchema)
userSchema.index({ email: 1, unique: true })

module.exports = { User }
*/
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var imageSchema = require('../models/image').imageSchema;


const uspsSchema = new Schema({
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip5: String,
    zip4: String
});


const addressSchema = new Schema ({
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
    usps_address: uspsSchema,
    verified: Date,
    error: String,
    active: {
        type: Boolean,
        default: true
    },
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'user'
    },
    whiteRabbit: {
        type: Boolean,
        default: false
    },
    team: { 
        type: Schema.Types.ObjectId, 
        ref: 'team'
    },
    subgroup: { 
        type: Schema.Types.ObjectId, 
        ref: 'team_subgroup'
    },
    // Deprecated
    lastsave: String,
    order: { 
        type: Number,
        default: 9999
    },
    lastCleaned: Date,
    percentClean: Number,
    program: { 
        type: Schema.Types.ObjectId, 
        ref: 'program'
    },
    notes: String
});


const UserAddress = mongoose.model('user_address',addressSchema);
addressSchema.index({ user: 1 });
addressSchema.index({ subgroup: 1 });
addressSchema.index({ team: 1 });

let validContentTypes = ['image/png','image/jpeg'];

const userSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
        },
    lastlogin: Date,
    name: String,
    password: String,
    emails: [{email: String, verified: Boolean, code: String, failed: Number}],
    active: {
        type: Boolean,
        default: true
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    image: {
        type: imageSchema
    },
    addresses: {
        type: [addressSchema],
        default: [],
        required: true
    },
    selectedAddress: {
        type: Number,
        default: 0
    },
    image: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    },
    access_token: {
        type: String,
        required: false,
        default: 'generate',
        validate: [
            function(token) {
                if (token == 'generate') {
                    this.access_token = '';
                }
                return true;
            }, 'Nothing'
        ]
    },
    phones: [{
        number: String, 
        verified: Boolean, 
        code: String,
        failed: Number
    }],
    timeZone: {
        type: String,
        default: 'America/New_York'
    },
    verifyCode: String,
    verifyCodeExpiration: Number
});

const User = mongoose.model('user',userSchema);

userSchema.index({ created: 1 });
userSchema.index({ "emails.email": 1 });
userSchema.index({ name: 1 });

module.exports = { 
    addressSchema,
    User, 
    UserAddress
};

