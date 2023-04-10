import { Schema, model, connect } from 'mongoose';
import { Types } from 'mongoose';

/* 
This format mimics the form returned by the multer package.
{
  fieldname: 'image',
  originalname: 'Screen Shot 2022-12-30 at 4.59.20 PM.png',
  encoding: '7bit',
  mimetype: 'image/png',
  buffer: <Buffer 89 50 4e ... 
  size: 217961
}
*/
export interface StoredImage {
    created: Date,
    user: Types.ObjectId,
    team: Types.ObjectId,
    key: string, // The name to use for storing in AWS 
    mimetype: string,
    originalname: string,
    thumbnail: {
        mimetype: String,
    },
    width: number,
    height: number
}


const imageSchema = new Schema<StoredImage>({
  created: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'team'
  },
  key: String, // The name to use for storing in AWS 
  mimetype: String,
  originalname: String,
  thumbnail: {
    mimetype: String,
  },
  width: Number,
  height: Number
});

export const StoredImageObject = model<StoredImage>('image', imageSchema)
imageSchema.index({ created: 1, user: 1 })

