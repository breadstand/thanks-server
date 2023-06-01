import { Router } from "express"
import { PostObject, Post, PostDetailed } from "../../../models/post"
import { getMemberByUserId } from "../../../services/teams"
import { createPost, deactivatePost, getPosts, pickWinners, sendToBountyCreator } from "../../../services/posts"
import { approveBounty, removeBounty } from "../../../services/bounties"
import { rmSync } from "fs"
import { ObjectId } from "mongoose";

const Types = require('mongoose').Types

export var postsRoutes = Router()


postsRoutes.get('/', async (req, res) => {

    try {
        let has_more = false
        let has_more_after = false

        // We only want authorized team members to see the posts
        let teamid = new Types.ObjectId(req.query.team)
        let member = await getMemberByUserId(teamid, req.userId)
        if (!member) {
            return res.status(401).send('User is not a member of this team.')
        }


        let query: any = {
            team: teamid,
            active: true
        };
        let sort: any = {
            _id: 'desc'
        }

        let limit = 50
        if (req.query.limit) {
            limit = Math.min(Number(req.query.limit), 100)
        }

        if (req.query.ending_before) {
            has_more_after = true
            query._id = { $lt: req.query.ending_before }
            // Increase limit so we can detect has_more and has_more_before
        }

        if (req.query.starting_after) {
            has_more = true
            query._id = { $gt: req.query.starting_after }
            sort._id = 'asc'
            // Increase limit so we can detect has_more and has_more before
        }

        if (req.query.post_type) {
            query.postType = req.query.post_type
        }
        if (req.query.winner) {
            query.winner = req.query.winner
        }
        if (req.query.created_by) {
            query.createdBy = new Types.ObjectId(req.query.created_by)
        }
        if (req.query.thanks_to) {
            query.thanksTo = new Types.ObjectId(req.query.thanks_to)
        }

        let posts = await PostObject.find(query)
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
                has_more_after = true
                posts.pop()
            }
            posts.sort((a: Post, b: Post) => {
                if (a._id > b._id) {
                    return -1
                }
                return 1
            })
        } else {
            if (posts.length > limit) {
                has_more = true
                posts.pop()
            }
        }

        res.json({
            success: true,
            has_more: has_more,
            has_more_after: has_more_after,
            error: '',
            data: posts
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')
    }
})

postsRoutes.post('/', async (req, res) => {
    try {
        let newPost = req.body as Post

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
        res.json({
            success: true,
            data: post
        })




    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})


postsRoutes.post('/stranger', async (req, res) => {
    try {

        let missingFields = []
        if (!req.body.thanksFor) {
            missingFields.push('thanksFor')
        }
        if (!req.body.contact || !req.body.contact.contact) {
            missingFields.push('contact')
        }
        if (!req.body.createdBy || !req.body.createdBy) {
            missingFields.push('createdBy')
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
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})




postsRoutes.put('/:id', async (req, res) => {
    try {
        let postid = new Types.ObjectId(req.params.id)

        // Load post
        let post = await PostObject.findById(postid) as Post

        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            })
        }

        // Only team owners or post owners can deactivePosts
        let member = await getMemberByUserId(post.team, req.userId)
        if (!member) {
            return res.status(401).send("You're not a member of the team that posted this.")
        }

        if (!member.owner && String(member._id) != String(post.createdBy)) {
            return res.status(401).send("You are not the team owner or creator.")
        }

        let update: any = {}
        if (req.body.idea) {
            update.idea = req.body.idea
        }
        if (req.body.bounty) {
            update.bounty = req.body.bounty
        }
        if (req.body.thanksFor) {
            update.thanksFor = req.body.thanksFor
        }
        let updatedPost = await PostObject.findByIdAndUpdate(postid,update,{new: true})
            res.json({
                success: true,
                error: '',
                data: updatedPost
            })

        if (updatedPost?.bounty) {
            sendToBountyCreator(updatedPost._id);
        }
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')
    }
})


postsRoutes.put('/:id/deactivate', async (req, res) => {
    try {
        let postId = new Types.ObjectId(req.params.id)

        // Load post
        let post = await PostObject.findById(postId) as Post

        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            })
        }

        // Only team owners or post owners can deactivePosts
        let member = await getMemberByUserId(post.team, req.userId)
        if (!member) {
            return res.status(401).send("You're not a member of the team that posted this.")
        }

        if (!member.owner && String(member._id) != String(post.createdBy)) {
            return res.status(401).send("You are not the team owner or creator.")
        }

        let updatedPost = await deactivatePost(postId)

        res.json({
            success: true,
            data: updatedPost
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})




postsRoutes.put('/:id/set-approved', async (req, res) => {
    try {
        let postid = new Types.ObjectId(req.params.id)

        // Load post
        let post = await PostObject.findById(postid) as Post

        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            })
        }

        // Only team owners can approve/disapprove
        let member = await getMemberByUserId(post.team, req.userId)
        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        if (req.body.approved) {
            let updatedPost = await approveBounty(postid)
            res.json({
                success: true,
                error: '',
                data: updatedPost
            })
        } else {
            let updatedPost = await removeBounty(postid)
            res.json({
                success: true,
                error: '',
                data: updatedPost
            })
        }

    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')
    }
})


postsRoutes.put('/:id/disapprove', async (req, res) => {
    try {
        let postId = new Types.ObjectId(req.params.id)

        // Load post
        let post = await PostObject.findById(postId) as Post

        if (!post.team) {
            return res.json({
                success: false,
                error: 'Post is corrupt',
                data: post
            })
        }

        // Only team owners can approve/disapprove
        let member = await getMemberByUserId(post.team, req.userId)
        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let updatedPost = await removeBounty(postId)
        res.json({
            success: true,
            error: '',
            data: updatedPost
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')
    }
})


postsRoutes.get('/pick-winners-iris', async (req, res) => {
    try {
        let results = await pickWinners()
        res.json({
            success: true,
            error: '',
            data: results
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})