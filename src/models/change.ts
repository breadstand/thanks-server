import { Model, model, ObjectId, Schema } from 'mongoose';

export interface Change {
    created: Date,
    user: ObjectId,    
    item: string,
    id: string,
    reason: string,
    changes: [
        {
        property: string,
        fromValue: string,
        toValue: string
        }
    ]
}

interface ChangeMethods extends Model<Change> {
    record(object:any,property:any,toValue:any):void;
}

type ChangeModel = Model<Change, {}, ChangeMethods>;

const changeSchema = new Schema<Change,ChangeModel,ChangeMethods>({
    created: {
        type: Date,
        default: Date.now
        },
    user: { 
        type: Schema.Types.ObjectId, 
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



changeSchema.methods.record = function(object:any,property:any,toValue:any) {
    let fromValue = object[property];
    let fromValueString = String(fromValue);
    let toValueString = toValue? toValue.toString():"";

    if (toValue === null || (fromValueString != toValueString && toValue !== undefined)) {
        this.changes.push({
            property: property,
            fromValue: fromValueString,
            toValue: toValueString
        });
        object[property] = toValue;
    }
}

changeSchema.methods.recordPush = function(object:any,property:any,newValue:any) {
    let fromValue = object[property];
    let fromValueString = fromValue? fromValue.toString():"";
    object[property].push(newValue);
    let newValueString = object[property].toString();
    
    this.changes.push({
        property: property,
        fromValue: fromValueString,
        toValue: newValueString
    });
}


changeSchema.statics.getAllChanges = function search (item, id) {
    return this.find({item: item,id: id}).populate('user').sort({_id: -1});
};

changeSchema.index({item: 1,id: 1});
export const ChangeObject = model<Change,ChangeModel>('change',changeSchema);

