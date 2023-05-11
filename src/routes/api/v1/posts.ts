import { Router } from "express"
import { PostObject, Post, PostDetailed } from "../../../models/post"
import { getMemberByUserId } from "../../../services/teams"
import { createPost, deactivatePost, getPosts } from "../../../services/posts"
import { approveBounty, removeBounty } from "../../../services/bounties"

const Types = require('mongoose').Types

export var postsRoutes = Router()


postsRoutes.get('/', async (req, res) => {

    try {
        // We only want authorized team members to see the posts
        let teamid = new Types.ObjectId(req.query.team)
        let member = await getMemberByUserId(teamid,req.userId)
        if (!member) {
            throw "User is not a member of team"
        }

        let limit = 100

        let query: any = {
            team: teamid,
            active: true
        };

        if (req.body.limit) {
            let newLimit = parseInt(req.body.limit)
            if (newLimit <= 100) {
                limit = newLimit
            }
        }

        let posts = await PostObject.find(query)
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
        if (!newPost.postType || (newPost.postType != 'thanks' && newPost.postType !='idea')) {
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
                error: "The post is incomplete. It's missing the following fields: "+missingFields.join(', '),
                data: newPost
            })
        }

        // Only team owners or post owners can deactivePosts
        let member = await getMemberByUserId(newPost.team,req.userId)
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
        let member = await getMemberByUserId(post.team,req.userId)
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
        let member = await getMemberByUserId(post.team,req.userId)
        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        if (req.body.approve) {
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
        let member = await getMemberByUserId(post.team,req.userId)
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