import { Router } from "express"
import { ThanksPostObject, ThanksPost } from "../../../models/thankspost"
import { getMemberByUserId } from "../../../services/teams"
import { approveBounty, createThanksPost, deactivatePost, getThanksPosts, removeBounty } from "../../../services/thanks"
const Types = require('mongoose').Types

export var thanksPostsRoutes = Router()


thanksPostsRoutes.get('/', async (req, res) => {

    try {
        // We only want authorized team members to see the posts
        let teamId = new Types.ObjectId(req.query.team)
        let member = await getMemberByUserId(teamId,req.userId)
        if (!member) {
            throw "User is not a member of team"
        }
        let thanksPosts = await getThanksPosts(teamId,null)
        res.json({
            success: true,
            data: thanksPosts
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})

thanksPostsRoutes.post('/', async (req, res) => {
    try {
        let newPost = req.body as ThanksPost

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
            return res.json({
                success: false,
                error: "You're not a member of the post's team.",
                data: newPost
            })
        }

        if (!member.owner && String(member._id)==String(newPost.createdBy)) {
            return res.json({
                success: false,
                error: "You're not authorized to deactivate this post. You're not the creator or team owner.",
                data: newPost
            })

        }

        let thanksPost = await createThanksPost(newPost)
        res.json({
            success: true,
            data: thanksPost
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})


thanksPostsRoutes.put('/:id/deactivate', async (req, res) => {
    try {
        let postId = new Types.ObjectId(req.params.id)

        // Load post
        let post = await ThanksPostObject.findById(postId) as ThanksPost

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
            return res.json({
                success: false,
                error: "You're not a member of the that posted this.",
                data: {}
            })
        }

        if (!member.owner && String(member._id)==String(post.createdBy)) {
            return res.json({
                success: false,
                error: "You're not authorized to deactivate this post. You're not the creator or team owner.",
                data: {}
            })

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




thanksPostsRoutes.put('/:id/bounties/:bountyid/approve', async (req, res) => {
    try {
        let postId = new Types.ObjectId(req.params.id)
        let bountyId = new Types.ObjectId(req.params.bountyid)

        // Load post
        let post = await ThanksPostObject.findById(postId) as ThanksPost

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

        let updatedPost = await approveBounty(postId,bountyId)
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


thanksPostsRoutes.put('/:id/bounties/:bountyid/remove', async (req, res) => {
    try {
        let postId = new Types.ObjectId(req.params.id)
        let bountyId = new Types.ObjectId(req.params.bountyid)

        // Load post
        let post = await ThanksPostObject.findById(postId) as ThanksPost

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

        let updatedPost = await removeBounty(postId,bountyId)
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