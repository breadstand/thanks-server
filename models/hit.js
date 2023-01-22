var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//var ValidationError = require('../models/error').ValidationError;

const hitSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
        },
    url: String,
    user: { type: Schema.Types.ObjectId, ref: 'user' }
});

const Hit = mongoose.model('hit',hitSchema);
hitSchema.index({ created: 1}); 
hitSchema.index({ created: 1,url: 1}); 

module.exports = { Hit };

