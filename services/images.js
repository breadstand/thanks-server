var AWS = require('aws-sdk');
const sharp = require('sharp');


function generateThumbnail(imageBuffer,width,height) {
    var resize_params = { height: 300 };
    if (height) {
        resize_params.height = height;
    }
    if (width) {
        resize_params.width = width;
    }

    return new Promise( (resolve,reject) => {
        sharp(imageBuffer)
        .resize(resize_params)
        .rotate()
        .jpeg()
        .toBuffer()
        .then( data => {
            return resolve(data);
        }).catch( err => {
            reject(err);
        });
    });
}

function convertToJpeg(imageBuffer) {
    return new Promise( (resolve,reject) => {
        sharp(imageBuffer)
        .rotate()
        .jpeg()
        .toBuffer()
        .then( data => {
            return resolve(data);
        }).catch( err => {
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

async function saveImageBuffer(key,imageBuffer,options={convertToJpeg: true, generateThumbnail: true}) {
    let jobs = [];
    let imageBufferToSave = imageBuffer;
    let thumbnailBufferToSave;

    if (options.convertToJpeg) {
        jobs.push(convertToJpeg(imageBuffer));
    }
    if (options.generateThumbnail) {
        jobs.push(generateThumbnail(imageBuffer));
    }

    let results = await Promise.all(jobs);

    if (options.convertToJpeg) {
        imageBufferToSave = results.shift();
    }
    if (options.generateThumbnail) {
        thumbnailBufferToSave = results.shift();
    }

    let s3 = new AWS.S3();

    let saveImageJob = new Promise( (resolve,reject) => {
        let params = {
            Body: imageBufferToSave, 
            Bucket: process.env.AWS_BUCKET_NAME, 
            Key: key
            };
        s3.putObject(params, function(err, data) {
            if (err) {
                reject(err);
            }// an error occurred
            else  {
                resolve(true);
            }      
        });     
    });
    jobs.push(saveImageJob);

    if (thumbnailBufferToSave) {
        let saveThumbnailJob = new Promise( (resolve,reject) => {
            let params = {
                Body: thumbnailBufferToSave, 
                Bucket: process.env.AWS_BUCKET_NAME, 
                Key: key+'-thumb'
                };
            s3.putObject(params, function(err, data) {
                if (err) {
                    reject(err);
                }// an error occurred
                else  {
                    resolve(true);
                }      
            });     
        });    
        jobs.push(saveThumbnailJob);
    }

    return Promise.all(jobs);
}


// Size undefined by default.
// size=='thumb' Loads the thumnail.
function getImageBuffer(key,size) {
    // Load main image

    if (size) {
        key += '-'+size;
    }
    var s3 = new AWS.S3();
    var params = {
        Bucket: process.env.AWS_BUCKET_NAME, 
        Key: key
        };

    return new Promise( (resolve,reject) => {
        s3.getObject(params, function(err, data) {
            if (err) {
                resolve(null);
            }
            else  {
                resolve(data.Body);
            }
        });
    });
}


function deleteImageBuffer(imageId) {
    // Load main image
    var s3 = new AWS.S3();
    var job1 =  new Promise( (resolve,reject) => {
        var params = {
            Bucket: process.env.AWS_BUCKET_NAME, 
            Key: imageId
            };
        s3.deleteObject(params, function(err, data) {
            if (err) {
                reject(err);
            }
            if (!data.Body) {
                resolve(true);
            }
            resolve(false);
        });
    });

    var job2 =  new Promise( (resolve,reject) => {
        var params = {
            Bucket: process.env.AWS_BUCKET_NAME, 
            Key: imageId+'-thumb'
            };
        s3.deleteObject(params, function(err, data) {
            if (err) {
                reject(err);
            }
            if (!data.Body) {
                resolve(true);
            }
            resolve(false);
        });
    });

    return Promise.all([job1,job2]);
}



module.exports = {
    deleteImageBuffer,
    getImageBuffer,
    saveImageBuffer,
    generateThumbnail,
    convertToJpeg
}
