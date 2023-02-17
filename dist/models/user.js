"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressObject = exports.UserObject = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("mongoose");
const userSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'image'
    },
    access_token: {
        type: String,
        required: false,
        default: 'generate',
        validate: [
            function (token) {
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'image'
    },
    backgroundImageWidth: Number,
    backgroundImageHeight: Number,
});
exports.UserObject = (0, mongoose_1.model)('user', userSchema);
userSchema.index({ created: 1 });
userSchema.index({ "emails.email": 1 });
userSchema.index({ name: 1 });
const uspsSchema = new mongoose_1.Schema({
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip5: String,
    zip4: String
});
const addressSchema = new mongoose_1.Schema({
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
    user: mongoose_2.Types.ObjectId,
});
exports.AddressObject = (0, mongoose_1.model)('user_address', addressSchema);
addressSchema.index({ user: 1 });
addressSchema.index({ subgroup: 1 });
addressSchema.index({ team: 1 });
let validContentTypes = ['image/png', 'image/jpeg'];
