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
exports.thanksPostsRoutes = void 0;
const express_1 = require("express");
const thankspost_1 = require("../../../models/thankspost");
const teams_1 = require("../../../services/teams");
const thanks_1 = require("../../../services/thanks");
const Types = require('mongoose').Types;
exports.thanksPostsRoutes = (0, express_1.Router)();
exports.thanksPostsRoutes.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        let thanksPosts = yield thankspost_1.ThanksPostObject.find(query)
            .sort({
            _id: -1
        })
            .limit(limit)
            .populate('thanksTo')
            .populate('prize')
            .populate('createdBy');
        res.json({
            success: true,
            error: '',
            data: thanksPosts
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.thanksPostsRoutes.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            return res.json({
                success: false,
                error: "You're not a member of the post's team.",
                data: newPost
            });
        }
        if (!member.owner && String(member._id) == String(newPost.createdBy)) {
            return res.json({
                success: false,
                error: "You're not authorized to deactivate this post. You're not the creator or team owner.",
                data: newPost
            });
        }
        let thanksPost = yield (0, thanks_1.createThanksPost)(newPost);
        res.json({
            success: true,
            data: thanksPost
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.thanksPostsRoutes.put('/:id/deactivate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postId = new Types.ObjectId(req.params.id);
        // Load post
        let post = yield thankspost_1.ThanksPostObject.findById(postId);
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
            return res.json({
                success: false,
                error: "You're not a member of the that posted this.",
                data: {}
            });
        }
        if (!member.owner && String(member._id) == String(post.createdBy)) {
            return res.json({
                success: false,
                error: "You're not authorized to deactivate this post. You're not the creator or team owner.",
                data: {}
            });
        }
        let updatedPost = yield (0, thanks_1.deactivatePost)(postId);
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
exports.thanksPostsRoutes.put('/:id/bounties/:bountyid/approve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postId = new Types.ObjectId(req.params.id);
        let bountyId = new Types.ObjectId(req.params.bountyid);
        // Load post
        let post = yield thankspost_1.ThanksPostObject.findById(postId);
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
        let updatedPost = yield (0, thanks_1.approveBounty)(postId, bountyId);
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
exports.thanksPostsRoutes.put('/:id/bounties/:bountyid/remove', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let postId = new Types.ObjectId(req.params.id);
        let bountyId = new Types.ObjectId(req.params.bountyid);
        // Load post
        let post = yield thankspost_1.ThanksPostObject.findById(postId);
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
        let updatedPost = yield (0, thanks_1.removeBounty)(postId, bountyId);
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
