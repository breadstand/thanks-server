import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";




function convertToJpeg(imageBuffer: Buffer) {
    var resize_params = {
        width: 1500,
        options: {
            withoutEnlargement: true
        }
    };

    return new Promise((resolve, reject) => {
        sharp(imageBuffer)
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


function resizeTo(imageBuffer: Buffer, width: number): Promise<Buffer> {
    var resize_params = {
        width: width,
        options: {
            withoutEnlargement: true
        }
    };

    return new Promise((resolve, reject) => {
        sharp(imageBuffer)
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

export async function saveImageToAWS(key: string, buffer: Buffer, options = { convertToJpeg: true, generateThumbnail: true }) {
    let jobs = [];
    let bufferForAWS = buffer;
    let thumbnailBufferForAWS: any;

    if (options.convertToJpeg) {
        jobs.push(convertToJpeg(buffer));
    }

    let results = await Promise.all(jobs);

    if (options.convertToJpeg) {
        bufferForAWS = results.shift() as Buffer;
    }

    let s3client = new S3Client({ region: process.env.AWS_REGION });

    let params: any = {
        Body: bufferForAWS,
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    };
    let putResults = s3client.send(new PutObjectCommand(params))

    return putResults;
}


// Size undefined by default.
// size=='thumb' Loads the thumnail.
export async function loadImageFromAWS(key: string, width: number | null = null) {
    // Load main image


    let s3client = new S3Client({ region: process.env.AWS_REGION });

    let input = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    }
    let response = await s3client.send(new GetObjectCommand(input))
    if (!response.Body) {
        return
    }

    let bodyAsArray = await response.Body.transformToByteArray()
    let image = Buffer.from(bodyAsArray)
    if (width) {
        image = await resizeTo(image, width)
    }
    return image
}


export async function deleteImageBuffer(imageId: string) {
    // Load main image

    let s3client = new S3Client({ region: process.env.AWS_REGION });

    let input = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageId
    }

    let response = await s3client.send(new DeleteObjectCommand(input))
    let inputThumb = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageId+'-thumb'
    }
    let responseThumb = await s3client.send(new DeleteObjectCommand(inputThumb))


}


