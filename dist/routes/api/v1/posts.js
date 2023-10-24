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
Object.defineProperty(exports, "__esModule", { value: true });
exports.postsRoutes = void 0;
const express_1 = require("express");
const post_1 = require("../../../models/post");
const teams_1 = require("../../../services/teams");
const posts_1 = require("../../../services/posts");
const bounties_1 = require("../../../services/bounties");
const Types = require('mongoose').Types;
exports.postsRoutes = (0, express_1.Router)();
exports.postsRoutes.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let has_more = false;
        let has_more_after = false;
        // We only want authorized team members to see the posts
        let teamid = new Types.ObjectId(req.query.team);
        let member = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!member) {
            return res.status(401).send('User is not a member of this team.');
        }
        let query = {
            team: teamid,
            active: true
        };
        let sort = {
            _id: 'desc'
        };
        let limit = 50;
        if (req.query.limit) {
            limit = Math.min(Number(req.query.limit), 100);
        }
        if (req.query.ending_before) {
            has_more_after = true;
            query._id = { $lt: req.query.ending_before };
            // Increase limit so we can detect has_more and has_more_before
        }
        if (req.query.starting_after) {
            has_more = true;
            query._id = { $gt: req.query.starting_after };
            sort._id = 'asc';
            // Increase limit so we can detect has_more and has_more before
        }
        if (req.query.post_type) {
            query.postType = req.query.post_type;
        }
        if (req.query.winner) {
            query.winner = req.query.winner;
        }
        if (req.query.created_by) {
            query.createdBy = new Types.ObjectId(req.query.created_by);
        }
        if (req.query.thanks_to) {
            query.thanksTo = new Types.ObjectId(req.query.thanks_to);
        }
        let posts = yield post_1.PostObject.find(query)
            .sort(sort)
            .limit(limit + 1)
            .populate('thanksTo')
            .populate('prize')
            .populate('bounty')
            .populate('createdBy');
        // When the query is "starting_after", the
        // sort is reversed, so we have to reverse it back.
        if (req.query.starting_after) {
            if (posts.length >= limit + 1) {
                has_more_after = true;
                posts.pop();
            }
            posts.sort((a, b) => {
                if (a._id > b._id) {
                    return -1;
                }
                return 1;
            });
        }
        else {
            if (posts.length > limit) {
                has_more = true;
                posts.pop();
            }
        }
        res.json({
            success: true,
            has_more: has_more,
            has_more_after: has_more_after,
            error: '',
            data: posts
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postsRoutes.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let newPost = req.body;
        let missingFields = [];
        if (!newPost.team) {
            missingFields.push('team');
        }
        if (!newPost.postType || (newPost.postType != 'thanks' && newPost.postType != 'idea')) {
            missingFields.push('postType');
        }
        if (!newPost.thanksTo && !newPost.thanksFor && newPost.postType == 'thanks') {
            missingFields.push('thanksTo');
            missingFields.push('thanksFor');
        }
        if (!newPost.idea && newPost.postType == 'idea') {
            missingFields.push('idea');
        }
        if (missingFields.length > 0) {
            return res.json({
                success: false,
                error: "The post is incomplete. It's missing the following fields: " + missingFields.join(', '),
                data: newPost
            });
        }
        // Only team owners or post owners can deactivePosts
        let member = yield (0, teams_1.getMemberByUserId)(newPost.team, req.userId);
        if (!member) {
            return res.status(401).send("You're not a member of the post's team.");
        }
        newPost.createdBy = member._id;
        if (!member.owner && String(member._id) != String(newPost.createdBy) && !newPost.active) {
            return res.status(401).send("You're not the owner of this post or an owner.");
        }
        let post = yield (0, posts_1.createPost)(newPost);
        res.json({
            success: true,
            data: post
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postsRoutes.post('/stranger', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let missingFields = [];
        if (!req.body.thanksFor) {
            missingFields.push('thanksFor');
        }
        if (!req.body.contact || !req.body.contact.contact) {
            missingFields.push('contact');
        }
        if (!req.body.createdBy || !req.body.createdBy) {
            missingFields.push('createdBy');
        }
        /*
        
                let newPost:Post = {
                    _id: new Types.ObjectId(undefined),
                    created: new Date(),
                    lastUpdate: new Date(),
                    createdBy:
                }*/
        /*

        let missingFields = []
        if (!newPost.team) {
            missingFields.push('team')
        }
        if (!newPost.postType || (newPost.postType != 'thanks' && newPost.postType != 'idea')) {
            missingFields.push('postType')
        }
        if (!newPost.thanksTo && !newPost.thanksFor && newPost.postType == 'thanks') {
            missingFields.push('thanksTo')
            missingFields.push('thanksFor')
        }
        if (!newPost.idea && newPost.postType == 'idea') {
            missingFields.push('idea')
        }
        if (missingFields.length > 0) {
            return res.json({
                success: false,
                error: "The post is incomplete. It's missing the following fields: " + missingFields.join(', '),
                data: newPost
            })
        }

        // Only team owners or post owners can deactivePosts
        let member = await getMemberByUserId(newPost.team, req.userId)
        if (!member) {
            return res.status(401).send("You're not a member of the post's team.")
        }
        newPost.createdBy = member._id

        if (!member.owner && String(member._id) != String(newPost.createdBy) && !newPost.active) {
            return res.status(401).send("You're not the owner of this post or an owner.")
        }
        let post = await createPost(newPost)
        */
        res.json({
            success: true,
            data: {}
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postsRoutes.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postid = new Types.ObjectId(req.params.id);
        // Load post
        let post = yield post_1.PostObject.findById(postid);
        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            });
        }
        // Only team owners or post owners can deactivePosts
        let member = yield (0, teams_1.getMemberByUserId)(post.team, req.userId);
        if (!member) {
            return res.status(401).send("You're not a member of the team that posted this.");
        }
        if (!member.owner && String(member._id) != String(post.createdBy)) {
            return res.status(401).send("You are not the team owner or creator.");
        }
        let update = {};
        if (req.body.idea) {
            update.idea = req.body.idea;
        }
        if (req.body.bounty) {
            update.bounty = req.body.bounty;
        }
        if (req.body.thanksFor) {
            update.thanksFor = req.body.thanksFor;
        }
        let updatedPost = yield post_1.PostObject.findByIdAndUpdate(postid, update, { new: true });
        res.json({
            success: true,
            error: '',
            data: updatedPost
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postsRoutes.put('/:id/deactivate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postId = new Types.ObjectId(req.params.id);
        // Load post
        let post = yield post_1.PostObject.findById(postId);
        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            });
        }
        // Only team owners or post owners can deactivePosts
        let member = yield (0, teams_1.getMemberByUserId)(post.team, req.userId);
        if (!member) {
            return res.status(401).send("You're not a member of the team that posted this.");
        }
        if (!member.owner && String(member._id) != String(post.createdBy)) {
            return res.status(401).send("You are not the team owner or creator.");
        }
        let updatedPost = yield (0, posts_1.deactivatePost)(postId);
        res.json({
            success: true,
            data: updatedPost
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postsRoutes.put('/:id/set-approved', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postid = new Types.ObjectId(req.params.id);
        // Load post
        let post = yield post_1.PostObject.findById(postid);
        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            });
        }
        // Only team owners can approve/disapprove
        let member = yield (0, teams_1.getMemberByUserId)(post.team, req.userId);
        if (!(member === null || member === void 0 ? void 0 : member.owner)) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.");
        }
        if (req.body.approved) {
            let updatedPost = yield (0, bounties_1.approveBounty)(postid);
            res.json({
                success: true,
                error: '',
                data: updatedPost
            });
        }
        else {
            let updatedPost = yield (0, bounties_1.removeBounty)(postid);
            res.json({
                success: true,
                error: '',
                data: updatedPost
            });
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postsRoutes.put('/:id/disapprove', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postId = new Types.ObjectId(req.params.id);
        // Load post
        let post = yield post_1.PostObject.findById(postId);
        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            });
        }
        // Only team owners can approve/disapprove
        let member = yield (0, teams_1.getMemberByUserId)(post.team, req.userId);
        if (!(member === null || member === void 0 ? void 0 : member.owner)) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.");
        }
        let updatedPost = yield (0, bounties_1.removeBounty)(postId);
        res.json({
            success: true,
            error: '',
            data: updatedPost
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
