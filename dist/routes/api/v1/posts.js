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
        // We only want authorized team members to see the posts
        let teamid = new Types.ObjectId(req.query.team);
        let member = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!member) {
            throw "User is not a member of team";
        }
        let limit = 100;
        let query = {
            team: teamid,
            active: true
        };
        if (req.body.limit) {
            let newLimit = parseInt(req.body.limit);
            if (newLimit <= 100) {
                limit = newLimit;
            }
        }
        let posts = yield post_1.PostObject.find(query)
            .sort({
            _id: -1
        })
            .limit(limit)
            .populate('thanksTo')
            .populate('prize')
            .populate('bounty')
            .populate('createdBy');
        res.json({
            success: true,
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
        if (req.body.approve) {
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
