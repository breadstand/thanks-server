
const Post = require('../models/post').Post
const images = require('../services/images')

function getPost(teamid) {
	return Post.findById(teamid).select('-photo.ETag');
}


/*
setPostImage()
This adds an image to a post.
Parameters:
postid - The _id of the post object from MongoDB
image - This is an object returned by multer. Basically it is "req.file"
    or req.files[index].
{
  fieldname: 'image',
  originalname: 'Screen Shot 2022-12-30 at 4.59.20 PM.png',
  encoding: '7bit',
  mimetype: 'image/png',
  buffer: <Buffer 89 50 4e ... 
  size: 217961
}

*/
async function setPostImage(postid,image) {
    var post = await getPost(postid);

    if (!post) {
        return;
    }

	if (image) {
        post.image = image
        post.image.key = 'post_'+post._id
        await images.saveImageBuffer(post.image.key,image.buffer);	
	}
    else {
		if(post.image && post.image.imageid) {
			await images.deleteImageBuffer(post.image.imageid);
		}
		post.image = undefined;
	}
    post.image.buffer = undefined;
    savedPost = await post.save();
    console.log('Image saved to post',savedPost)
    return savedPost
}


async function getPostImage(postid,size) {
    var post = await getPost(postid);
	if (!post || !post.image || !post.image.imageid) {
		return null;
	}
	let imageBuffer = await images.getImageBuffer(team.photo.imageid,size);
	let image = {
		data: imageBuffer,
		contentType: team.photo.contentType
	};
	return image;
}

module.exports = {
    getPost,
    setPostImage,
    getPostImage
}