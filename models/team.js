const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const teamSchema = new Schema({
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
    nudge_enabled: {
        type: Boolean,
        default: true
    },
    nudge_days: {
        type: Number,
        default: 15
    },
    nudge_subject: String,
    nudge_message: String,
    nudge_again_days: {
        type: Number,
        default: 15
    },
    lastnudge: Date,
    image: {
        type: Schema.Types.ObjectId,
        ref: 'image'
    }
});

const Team = mongoose.model('team',teamSchema);


module.exports = { 
    Team
};

