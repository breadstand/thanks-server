const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const membershipSchema = new Schema({
    team: { 
        type: Schema.Types.ObjectId, 
        ref: 'team'
    },
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'user'
    },
    name: String,
    phone: String,
    email: String,
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
});


const Membership = mongoose.model('membership',membershipSchema);
membershipSchema.index({ "team": 1});
membershipSchema.index({ "user": 1});
membershipSchema.index({ "phone": 1});
membershipSchema.index({ "email": 1});

module.exports = { 
    Membership
};

