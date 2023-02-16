import { Router } from "express"
import { PostObject,Post } from '../../../models/post'
import { SortOrder } from "mongoose"
const ObjectId = require('mongoose').ObjectId


export var postRoutes = Router()

interface PostQuery {
    user?: string,
    category?: string,
    draft?: boolean,
    deleted?: boolean,
    lastUpdate?: any
}

postRoutes.get('/', async (req, res) => {
    try {
        // has_more
        let has_more = false
        let has_more_after = false

        // ending_before
        // starting_after
        let query:any = {
            user: req.userId,
            draft: false,
            deleted: { $ne: true }
        }
        let sort:any = {
            lastUpdate: 'desc',
            created: 'desc'
        }
        let limit = 12;
        if (req.query.limit) {
            limit = Math.min(Number(req.query.limit),100)
        }
        if (req.query.category !== undefined) {
            query.category = req.query.category as string
        }
        if (req.query.draft !== undefined) {
            query.draft = (req.query.draft == 'true')
        }

        if (req.query.ending_before) {
            has_more_after = true
            query.lastUpdate = { $lt: req.query.ending_before }
            // Increase limit so we can detect has_more and has_more_before
        }
        if (req.query.starting_after) {
            has_more = true
            query.lastUpdate = { $gt: req.query.starting_after }
            sort.lastUpdate = 'asc'
            // Increase limit so we can detect has_more and has_more before
        }

        if (req.query.count_posts) {
            delete query.lastUpdate
            // For count requests, we'll skip the find
            let count = await PostObject.countDocuments(query)
            res.json({
                object: "number",
                success: true,
                data: count
            })
        } else {
            // put sort in here
            let posts = await PostObject.find(query)
                .sort(sort)
                .limit(limit + 1)

            // When the query is "starting_after", the
            // sort is reversed, so we have to reverse it back.
            if (req.query.starting_after) {
                if (posts.length >= limit + 1) {
                    has_more_after = true
                    posts.pop()
                }
                posts.sort((a:Post, b:Post) => {
                    if (a.lastUpdate > b.lastUpdate) {
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
                object: "list",
                success: true,
                data: posts,
                has_more: has_more,
                has_more_after: has_more_after
            })
        } 
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Internal server error')

    }
})



postRoutes.post('/', (req, res) => {
    let postData = req.body
    delete req.body._id
    let post = new PostObject(postData)
    post.user = req.userId;
    post.save()
        .then(savedPost => {
            res.status(200).send({
                success: true,
                data: savedPost
            })
        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

postRoutes.get('/:id', (req, res) => {
    PostObject.findById(req.params.id)
        .then(post => {
            res.json({
                success: true,
                data: post
            })
        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

postRoutes.put('/:id', (req, res) => {

    let options = {
        returnDocument: 'after',
    }

    let postUpdate = req.body;
    delete postUpdate._id
    delete postUpdate.user

    PostObject.findOneAndUpdate(
        { _id: req.params.id, user: req.userId }, postUpdate, options)
        .then(updatedPost => {
            res.status(200).json({
                success: true,
                data: updatedPost
            })
        })
        .catch(err => {
            res.status(500).send('Internal server error')
        })
})


