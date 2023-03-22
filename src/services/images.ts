import { S3 } from "aws-sdk";
import sharp from "sharp";



function generateThumbnail(imageBuffer:Buffer,width:number|null=null,height:number|null=null) {
    let resize_params:any = { 
        height: 300
    };
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

function convertToJpeg(imageBuffer:Buffer) {
    var resize_params = { 
        width: 1500,
        options: {
            withoutEnlargement: true
        } 
    };

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

export async function saveImageToAWS(key:string,buffer:Buffer,options={convertToJpeg: true, generateThumbnail: true}) {
    let jobs = [];
    let bufferForAWS = buffer;
    let thumbnailBufferForAWS:any;

    if (options.convertToJpeg) {
        jobs.push(convertToJpeg(buffer));
    }
    if (options.generateThumbnail) {
        jobs.push(generateThumbnail(buffer));
    }

    let results = await Promise.all(jobs);

    if (options.convertToJpeg) {
        bufferForAWS = results.shift() as Buffer;
    }
    if (options.generateThumbnail) {
        thumbnailBufferForAWS = results.shift();
    }

    let s3 = new S3();

    let saveImageJob = new Promise( (resolve,reject) => {
        let params:any = {
            Body: bufferForAWS, 
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

    if (thumbnailBufferForAWS) {
        let saveThumbnailJob = new Promise( (resolve,reject) => {
            let params:any = {
                Body: thumbnailBufferForAWS, 
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
export function loadImageFromAWS(key:string,size:string|null=null) {
    // Load main image

    if (size) {
        key += '-'+size;
    }
    var s3 = new S3();

    return new Promise( (resolve,reject) => {
        if (!process.env.AWS_BUCKET_NAME) {
            return reject('Missing process.env.AWS_BUCKET_NAME')
        }
        s3.getObject({
            Bucket: process.env.AWS_BUCKET_NAME, 
            Key: key
        }, function(err, data) {
            if (err) {
                resolve(null);
            }
            else  {
                resolve(data.Body);
            }
        });
    });
}


export function deleteImageBuffer(imageId:string) {
    // Load main image
    var s3 = new S3();
    var job1 =  new Promise( (resolve,reject) => {
        if (!process.env.AWS_BUCKET_NAME) {
            return reject('Missing process.env.AWS_BUCKET_NAME')
        }

        s3.deleteObject( {
            Bucket: process.env.AWS_BUCKET_NAME, 
            Key: imageId
            }, function(err, data) {
            if (err) {
                reject(err);
            }
            if (!data.DeleteMarker) {
                resolve(true);
            }
            resolve(false);
        });
    });

    var job2 =  new Promise( (resolve,reject) => {
        if (!process.env.AWS_BUCKET_NAME) {
            return reject('Missing process.env.AWS_BUCKET_NAME')
        }


        s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME, 
            Key: imageId+'-thumb'
            }, function(err, data) {
            if (err) {
                reject(err);
            }
            if (!data.DeleteMarker) {
                resolve(true);
            }
            resolve(false);
        });
    });

    return Promise.all([job1,job2]);
}


