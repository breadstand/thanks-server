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
exports.loadImageFromAWS = exports.saveImageToAWS = void 0;
const aws_sdk_1 = require("aws-sdk");
const sharp_1 = __importDefault(require("sharp"));
function generateThumbnail(imageBuffer, width = null, height = null) {
    let resize_params = {
        height: 300
    };
    if (height) {
        resize_params.height = height;
    }
    if (width) {
        resize_params.width = width;
    }
    return new Promise((resolve, reject) => {
        (0, sharp_1.default)(imageBuffer)
            .resize(resize_params)
            .rotate()
            .jpeg()
            .toBuffer()
            .then(data => {
            return resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}
function convertToJpeg(imageBuffer) {
    var resize_params = {
        width: 1500,
        options: {
            withoutEnlargement: true
        }
    };
    return new Promise((resolve, reject) => {
        (0, sharp_1.default)(imageBuffer)
            .resize(resize_params)
            .rotate()
            .jpeg()
            .toBuffer()
            .then(data => {
            return resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}
/*
saveImageBuffer()

This function saves an image to AWS.

options:
convertToJpeg
This converts the file in whatever the incoming format is, to JPEG (mainly to save space)

generateThumbnail
Also generates and saves a thumbnail version of the image. This is very useful for example with
profile photos. The user uploads a high res profile photo but in most cases, for performance we will
just want a thumbnail. So this happens automatically.

*/
function saveImageToAWS(key, buffer, options = { convertToJpeg: true, generateThumbnail: true }) {
    return __awaiter(this, void 0, void 0, function* () {
        let jobs = [];
        let bufferForAWS = buffer;
        let thumbnailBufferForAWS;
        if (options.convertToJpeg) {
            jobs.push(convertToJpeg(buffer));
        }
        if (options.generateThumbnail) {
            jobs.push(generateThumbnail(buffer));
        }
        let results = yield Promise.all(jobs);
        if (options.convertToJpeg) {
            bufferForAWS = results.shift();
        }
        if (options.generateThumbnail) {
            thumbnailBufferForAWS = results.shift();
        }
        let s3 = new aws_sdk_1.S3();
        let saveImageJob = new Promise((resolve, reject) => {
            let params = {
                Body: bufferForAWS,
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            };
            s3.putObject(params, function (err, data) {
                if (err) {
                    reject(err);
                } // an error occurred
                else {
                    resolve(true);
                }
            });
        });
        jobs.push(saveImageJob);
        if (thumbnailBufferForAWS) {
            let saveThumbnailJob = new Promise((resolve, reject) => {
                let params = {
                    Body: thumbnailBufferForAWS,
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key + '-thumb'
                };
                s3.putObject(params, function (err, data) {
                    if (err) {
                        reject(err);
                    } // an error occurred
                    else {
                        resolve(true);
                    }
                });
            });
            jobs.push(saveThumbnailJob);
        }
        return Promise.all(jobs);
    });
}
exports.saveImageToAWS = saveImageToAWS;
// Size undefined by default.
// size=='thumb' Loads the thumnail.
function loadImageFromAWS(key, size = null) {
    // Load main image
    if (size) {
        key += '-' + size;
    }
    var s3 = new aws_sdk_1.S3();
    return new Promise((resolve, reject) => {
        if (!process.env.AWS_BUCKET_NAME) {
            return reject('Missing process.env.AWS_BUCKET_NAME');
        }
        s3.getObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        }, function (err, data) {
            if (err) {
                resolve(null);
            }
            else {
                resolve(data.Body);
            }
        });
    });
}
exports.loadImageFromAWS = loadImageFromAWS;
function deleteImageBuffer(imageId) {
    // Load main image
    var s3 = new aws_sdk_1.S3();
    var job1 = new Promise((resolve, reject) => {
        if (!process.env.AWS_BUCKET_NAME) {
            return reject('Missing process.env.AWS_BUCKET_NAME');
        }
        s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: imageId
        }, function (err, data) {
            if (err) {
                reject(err);
            }
            if (!data.DeleteMarker) {
                resolve(true);
            }
            resolve(false);
        });
    });
    var job2 = new Promise((resolve, reject) => {
        if (!process.env.AWS_BUCKET_NAME) {
            return reject('Missing process.env.AWS_BUCKET_NAME');
        }
        s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: imageId + '-thumb'
        }, function (err, data) {
            if (err) {
                reject(err);
            }
            if (!data.DeleteMarker) {
                resolve(true);
            }
            resolve(false);
        });
    });
    return Promise.all([job1, job2]);
}
