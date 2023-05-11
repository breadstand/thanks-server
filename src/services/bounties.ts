import { ObjectId } from "mongoose";
import { PostObject } from "../models/post";
import { Bounty, BountyObject } from "../models/bounty";
import { notifyMember } from "./teams";

export async function approveBounty(postid: ObjectId) {
	let post = await PostObject.findById(postid).populate('bounty')
	if (!post) {
		return
	}
	
	post.approved = true
	await post.save()

	let bounty = post.bounty as Bounty

	let subject = 'Bounty Approved: ' + post.idea;
	let message = 'Your idea was approved for a bounty.\n' +
		'Idea: ' + post.idea +
		'Bounty: ' + bounty.name +
		'Amount: ' + bounty.amount;
	if (!post.createdBy) {
		return post
	}
	notifyMember(post.createdBy as ObjectId, subject, message);
	return post
};

export async function removeBounty(postid: ObjectId) {
	let post = await PostObject.findById(postid).populate('bounty')
	if (!post) {
		return
	}
	
	post.approved = false
	await post.save()
	return post;
}
