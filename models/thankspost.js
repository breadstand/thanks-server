const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const thanksSetSchema = new Schema({
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
const ThanksSet = mongoose.model('thanks_set',thanksSetSchema);


const thanksPostSchema = new Schema({
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
});

const ThanksPost = mongoose.model('thank',thanksPostSchema);
thanksPostSchema.index({createdBy: 1});
thanksPostSchema.index({thanksFor: 1});
thanksPostSchema.index({team: 1});
thanksPostSchema.index({created: 1});
thanksPostSchema.index({thanksFor: 1,winner: 1});
thanksPostSchema.index({team: 1,set: 1});


module.exports = { ThanksPost,ThanksSet };

