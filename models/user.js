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
    choices: [String],
    choiceSelected: {
        type: Number,
        default: 0
    },
    choiceStarted: Date,
    identity: String,
    intention: String,
    actions: String
})
const User = mongoose.model('user',userSchema)
userSchema.index({ email: 1, unique: true })

module.exports = { User }
