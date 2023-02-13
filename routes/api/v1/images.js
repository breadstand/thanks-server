const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const StoredImageObject = require('../../../dist/models/image').StoredImageObject
const {saveImageToAWS, loadImageFromAWS} = require('../../../services/images')

const upload = multer()

router.post('/',
  upload.single('image'),
  async (req, res) => {

      /* 
      This incoming file from multer will be like this:
      console.log(req.file)
      {
        fieldname: 'image',
        originalname: 'Screen Shot 2022-12-30 at 4.59.20 PM.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: <Buffer 89 50 4e ... 
        size: 217961
      }
      */


    try {
      const rawImage = await sharp(req.file.buffer)
      const metadata = await rawImage.metadata()

      // Creat the image. Note: image will be converted to JPG in the
      // saveImageToAWS step.
      let image = new StoredImageObject({
        user: req.userId,
        mimetype: 'image/jpeg',
        width: metadata.width,
        height: metadata.height,
        originalname: req.file.originalname
      })
      image.key = 'image_'+image._id
      await saveImageToAWS(image.key,req.file.buffer);
      await image.save()
      return res.json({ 
        success: true,
        data: image })
    } catch (e) {
      console.log(e);
      return res.status(500).send('Server error');
    };
  });


router.get('/:image', async (req, res) => {
  try {
    // image can be an image._id or image._id + '.jpg'
    let imageId = req.params.image.split('.')[0]

    let image = await StoredImageObject.findOne({
        _id: imageId,
        user: req.userId
    })
    let buffer = await loadImageFromAWS(image.key)
    if (!buffer) {
      return res.status(500).send('Server error')
    }
    res.contentType(image.mimetype);
    return res.send(buffer);
  } catch (e) {
    console.log(e);
    res.status(404).send("Not found");
  }
});



module.exports = router