"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageRoutes = void 0;
const express_1 = require("express");
const sharp_1 = __importDefault(require("sharp"));
const image_1 = require("../../../models/image");
const images_1 = require("../../../services/images");
const multer = require('multer');
exports.imageRoutes = (0, express_1.Router)();
const upload = multer();
exports.imageRoutes.post('/', upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            });
        }
        const rawImage = yield (0, sharp_1.default)(req.file.buffer);
        const metadata = yield rawImage.metadata();
        // Creat the image. Note: image will be converted to JPG in the
        // saveImageToAWS step.
        let image = new image_1.StoredImageObject({
            user: req.userId,
            mimetype: 'image/jpeg',
            width: metadata.width,
            height: metadata.height,
            originalname: req.file.originalname
        });
        image.key = 'image_' + image._id;
        yield (0, images_1.saveImageToAWS)(image.key, req.file.buffer);
        yield image.save();
        return res.json({
            success: true,
            data: image
        });
    }
    catch (e) {
        console.log(e);
        return res.status(500).send('Server error');
    }
    ;
}));
exports.imageRoutes.get('/:image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // image can be an image._id or image._id + '.jpg'
        // image may also contain an optional width which is a dash
        // 181230123123-123.jpg (the 123 is the width)
        let imageId = req.params.image.split('.')[0];
        let imageIdPieces = imageId.split('-');
        let width = null;
        if (imageIdPieces.length > 1) {
            imageId = imageIdPieces[0];
            width = parseInt(imageIdPieces[1]);
        }
        let image = yield image_1.StoredImageObject.findOne({
            _id: imageId,
            user: req.userId
        });
        if (!image) {
            throw "Image not found";
        }
        let buffer = yield (0, images_1.loadImageFromAWS)(image.key, width);
        if (!buffer) {
            return res.status(500).send('Server error');
        }
        res.contentType(image.mimetype);
        return res.send(buffer);
    }
    catch (e) {
        console.log(e);
        res.status(404).send("Not found");
    }
}));
exports.imageRoutes.delete('/:image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try { // image can be an image._id or image._id + '.jpg'
        let imageId = req.params.image.split('.')[0];
        let image = yield image_1.StoredImageObject.findOne({
            _id: imageId,
            user: req.userId
        });
        if (!image) {
            return res.status(404).send('Not found');
        }
        if (String(image.user) != String(req.userId)) {
            return res.status(401).send('Unauthorized');
        }
        yield (0, images_1.deleteImageBuffer)(imageId);
        return res.json({
            success: true,
            error: '',
            data: image
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).send('Server error');
    }
}));
