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
    key: String, // The name to use for storing in AWS 
    mimetype: String,
    originalname: String,
    size: Number,
    buffer: Buffer,
    ETag: String, // Not sure this is used.
    thumbnail: {
        buffer: Buffer,
        mimetype: String,
        size: Number,
        ETag: String // Not sure if this is used
    }
});
module.exports =  { imageSchema };

