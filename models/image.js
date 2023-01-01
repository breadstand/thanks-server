const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

const imageSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },

  key: String, // The name to use for storing in AWS 
  mimetype: String,
  originalname: String,
  thumbnail: {
    mimetype: String,
  }
});

const Image = mongoose.model('image', imageSchema)
imageSchema.index({ created: 1, user: 1 })

module.exports = { Image };

