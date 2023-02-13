"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeObject = void 0;
const mongoose_1 = require("mongoose");
const changeSchema = new mongoose_1.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    item: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    reason: String,
    changes: [
        {
            property: String,
            fromValue: String,
            toValue: String
        }
    ]
});
changeSchema.methods.record = function (object, property, toValue) {
    let fromValue = object[property];
    let fromValueString = String(fromValue);
    let toValueString = toValue ? toValue.toString() : "";
    if (toValue === null || (fromValueString != toValueString && toValue !== undefined)) {
        this.changes.push({
            property: property,
            fromValue: fromValueString,
            toValue: toValueString
        });
        object[property] = toValue;
    }
};
changeSchema.methods.recordPush = function (object, property, newValue) {
    let fromValue = object[property];
    let fromValueString = fromValue ? fromValue.toString() : "";
    object[property].push(newValue);
    let newValueString = object[property].toString();
    this.changes.push({
        property: property,
        fromValue: fromValueString,
        toValue: newValueString
    });
};
changeSchema.statics.getAllChanges = function search(item, id) {
    return this.find({ item: item, id: id }).populate('user').sort({ _id: -1 });
};
changeSchema.index({ item: 1, id: 1 });
exports.ChangeObject = (0, mongoose_1.model)('change', changeSchema);
