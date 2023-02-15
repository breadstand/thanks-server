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
exports.postRoutes = void 0;
const express_1 = require("express");
const post_1 = require("../../../models/post");
const ObjectId = require('mongoose').ObjectId;
exports.postRoutes = (0, express_1.Router)();
exports.postRoutes.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // has_more
        let has_more = false;
        let has_more_after = false;
        // ending_before
        // starting_after
        let query = {
            user: req.userId,
            draft: false,
            deleted: false
        };
        let sort = {
            lastUpdate: 'desc',
            created: 'desc'
        };
        let limit = 12;
        if (req.query.limit) {
            limit = Math.min(Number(req.query.limit), 100);
        }
        if (req.query.category !== undefined) {
            query.category = req.query.category;
        }
        if (req.query.draft !== undefined) {
            query.draft = (req.query.draft == 'true');
        }
        if (req.query.ending_before) {
            has_more_after = true;
            query.lastUpdate = { $lt: req.query.ending_before };
            // Increase limit so we can detect has_more and has_more_before
        }
        if (req.query.starting_after) {
            has_more = true;
            query.lastUpdate = { $gt: req.query.starting_after };
            sort.lastUpdate = 'asc';
            // Increase limit so we can detect has_more and has_more before
        }
        if (req.query.count_posts) {
            delete query.lastUpdate;
            // For count requests, we'll skip the find
            let count = yield post_1.PostObject.countDocuments(query);
            res.json({
                object: "number",
                success: true,
                data: count
            });
        }
        else {
            // put sort in here
            let posts = yield post_1.PostObject.find(query)
                .sort({})
                .limit(limit + 1);
            // When the query is "starting_after", the
            // sort is reversed, so we have to reverse it back.
            if (req.query.starting_after) {
                if (posts.length >= limit + 1) {
                    has_more_after = true;
                    posts.pop();
                }
                posts.sort((a, b) => {
                    if (a.lastUpdate > b.lastUpdate) {
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
                object: "list",
                success: true,
                data: posts,
                has_more: has_more,
                has_more_after: has_more_after
            });
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
exports.postRoutes.post('/', (req, res) => {
    let postData = req.body;
    delete req.body._id;
    let post = new post_1.PostObject(postData);
    post.user = new ObjectId(req.userId);
    post.save()
        .then(savedPost => {
        res.status(200).send({
            success: true,
            data: savedPost
        });
    }).catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.postRoutes.get('/:id', (req, res) => {
    post_1.PostObject.findById(req.params.id)
        .then(post => {
        res.json({
            success: true,
            data: post
        });
    }).catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.postRoutes.put('/:id', (req, res) => {
    let options = {
        returnDocument: 'after',
    };
    let postUpdate = req.body;
    delete postUpdate._id;
    delete postUpdate.user;
    post_1.PostObject.findOneAndUpdate({ _id: req.params.id, user: req.userId }, postUpdate, options)
        .then(updatedPost => {
        res.status(200).json({
            success: true,
            data: updatedPost
        });
    })
        .catch(err => {
        res.status(500).send('Internal server error');
    });
});
