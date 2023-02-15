import express, {Request,Response,Application} from 'express';
require('dotenv').config()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const PORT = 3000
const app:Application = express();

import { verifyToken } from './services/utils';

app.use(cors())
app.use(bodyParser.json())

import { apiRootRoutes } from './routes/api/v1/index'
app.use('/api/v1',apiRootRoutes)

import { postRoutes } from './routes/api/v1/posts';
app.use('/api/v1/posts',verifyToken)
app.use('/api/v1/posts',postRoutes)

import { userRoutes } from './routes/api/v1/users';
app.use('/api/v1/users',verifyToken)
app.use('/api/v1/users',userRoutes)

import { imageRoutes } from './routes/api/v1/images';
app.use('/api/v1/images',verifyToken)
app.use('/api/v1/images',imageRoutes)

import { habitTrackerRouters } from './routes/api/v1/habit-trackers';
app.use('/api/v1/habit-trackers',verifyToken)
app.use('/api/v1/habit-trackers',habitTrackerRouters)

import { membershipRoutes } from './routes/api/v1/memberships';
app.use('/api/v1/memberships',verifyToken)
app.use('/api/v1/memberships',membershipRoutes)

import { thanksPostsRoutes } from './routes/api/v1/thanksposts';
app.use('/api/v1/thanksposts',verifyToken)
app.use('/api/v1/thanksposts',thanksPostsRoutes)



app.get('/',function(req,res) {
    res.send('Hello from server');
});

mongoose.connect(process.env.MONGOURI)
.catch( (err:any) => console.log(err) )


app.listen(PORT,function() {
    console.log('Server running on localhost:'+PORT);
});

