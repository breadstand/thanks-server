import { Router } from "express";
import sharp from "sharp";
import { StoredImageObject } from "../../../models/image";
import { deleteImageBuffer, loadImageFromAWS, saveImageToAWS } from "../../../services/images"
import { getMemberByUserId } from "../../../services/teams";
const Types = require('mongoose').Types
const multer = require('multer')

export var imageRoutes = Router()


const upload = multer()



imageRoutes.post('/',
  upload.single('image'),
  async (req, res) => {
    let teamid = req.body.teamid
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
      if (!req.file) {
        return res.json({
          success: false,
          error: 'File missing',
          data: null
        })
      }

      // Check that the user is authorized
      let member = getMemberByUserId(teamid,req.userId)
      if (!member) {
        return res.send(404).send("Unauthorized: You do not belong to this team")
      }

      const rawImage = await sharp(req.file.buffer).rotate()
      const metadata = await rawImage.metadata()

      // width and height depend upon the orientation
      let width = metadata.width
      let height = metadata.height
      // According to the EXIF orientation anything greater than 4 
      // means the image is rotated 90 degrees CW or CCW
      if (metadata.orientation && metadata.orientation > 4) {
        width = metadata.height
        height = metadata.width
      }

      // Create the image. Note: image will be converted to JPG in the
      // saveImageToAWS step.
      let image = new StoredImageObject({
        user: req.userId,
        team: teamid,
        mimetype: 'image/jpeg',
        width: width,
        height: height,
        originalname: req.file.originalname
      })
      image.key = 'image_' + image._id
      await saveImageToAWS(image.key, req.file.buffer);
      await image.save()
      return res.json({
        success: true,
        data: image
      })
    } catch (e) {
      console.log(e);
      return res.status(500).send('Server error');
    };
  });


imageRoutes.get('/:image', async (req, res) => {
  try {
    // image can be an image._id or image._id + '.jpg'
    // image may also contain an optional width which is a dash
    // 181230123123-123.jpg (the 123 is the width)
    let imageId = req.params.image.split('.')[0]
    let imageIdPieces = imageId.split('-')
    let width:null|number = null
    if (imageIdPieces.length > 1) {
      imageId = imageIdPieces[0]
      width = parseInt(imageIdPieces[1])
    }

    // Load the image
    let image = await StoredImageObject.findOne({
      _id: imageId
    })
    if (!image) {
      return res.status(404).send("Not found");
    }

    // Only members of the same team can view the image
    if (image.team) {
      let teamid = Types.ObjectId(String(image.team))
      let currentMember = getMemberByUserId(teamid,req.userId)
      if (!currentMember) {
        return res.status(404).send('You do not appear to be a member of the same team')

      }  
    }

    let buffer = await loadImageFromAWS(image.key,width)
    res.contentType(image.mimetype);
    return res.send(buffer);
  } catch (e) {
    console.log(e);
    res.status(404).send("Not found");
  }
});


imageRoutes.delete('/:image', async (req, res) => {
  try {    // image can be an image._id or image._id + '.jpg'
    let imageId = req.params.image.split('.')[0]

    let image = await StoredImageObject.findOne({
      _id: imageId,
      user: req.userId
    })
    if (!image) {
      return res.status(404).send('Not found')
    }
    if (String(image.user) != String(req.userId)) {
      return res.status(401).send('Unauthorized')
    }

    await deleteImageBuffer(imageId)
    return res.json({
      success: true,
      error: '',
      data: image
    })

  }
  catch(err) {  
    console.log(err)
    return res.status(500).send('Server error');

  }

})

