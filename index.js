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

