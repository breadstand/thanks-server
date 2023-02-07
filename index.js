const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const verifyToken = require('./utils/utils').verifyToken

const PORT = 3000
const app = express()

app.use(cors())
app.use(bodyParser.json())

const apiRoutes = require('./routes/api/v1/index')
app.use('/api/v1',apiRoutes)

const postsRoutes = require('./routes/api/v1/posts')
app.use('/api/v1/posts',verifyToken)
app.use('/api/v1/posts',postsRoutes)

const usersRoutes = require('./routes/api/v1/users')
app.use('/api/v1/users',verifyToken)
app.use('/api/v1/users',usersRoutes)

const imagesRoutes = require('./routes/api/v1/images')
app.use('/api/v1/images',verifyToken)
app.use('/api/v1/images',imagesRoutes)

const habitTrackerRoutes = require('./routes/api/v1/habit-trackers')
app.use('/api/v1/habit-trackers',verifyToken)
app.use('/api/v1/habit-trackers',habitTrackerRoutes)

const membershipRoutes = require('./routes/api/v1/memberships')
app.use('/api/v1/memberships',verifyToken)
app.use('/api/v1/memberships',membershipRoutes)

const thanksPostsRoutes = require('./routes/api/v1/thanksposts')
app.use('/api/v1/thanksposts',verifyToken)
app.use('/api/v1/thanksposts',thanksPostsRoutes)



app.get('/',function(req,res) {
    res.send('Hello from server');
});

mongoose.connect(process.env.MONGOURI,err => {
    if (err) {
        console.error('Error!' + err)
    } else {
        console.log('Connected to mongodb')
    }
})

app.listen(PORT,function() {
    console.log('Server running on localhost:'+PORT);
});

