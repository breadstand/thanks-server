"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const PORT = 3000;
const app = (0, express_1.default)();
const utils_1 = require("./services/utils");
app.use(cors());
app.use(bodyParser.json());
const index_1 = require("./routes/api/v1/index");
app.use('/api/v1', index_1.apiRootRoutes);
const posts_1 = require("./routes/api/v1/posts");
app.use('/api/v1/posts', utils_1.verifyToken);
app.use('/api/v1/posts', posts_1.postRoutes);
const users_1 = require("./routes/api/v1/users");
app.use('/api/v1/users', utils_1.verifyToken);
app.use('/api/v1/users', users_1.userRoutes);
const images_1 = require("./routes/api/v1/images");
app.use('/api/v1/images', utils_1.verifyToken);
app.use('/api/v1/images', images_1.imageRoutes);
const habit_trackers_1 = require("./routes/api/v1/habit-trackers");
app.use('/api/v1/habit-trackers', utils_1.verifyToken);
app.use('/api/v1/habit-trackers', habit_trackers_1.habitTrackerRouters);
const memberships_1 = require("./routes/api/v1/memberships");
app.use('/api/v1/memberships', utils_1.verifyToken);
app.use('/api/v1/memberships', memberships_1.membershipRoutes);
const thanksposts_1 = require("./routes/api/v1/thanksposts");
app.use('/api/v1/thanksposts', utils_1.verifyToken);
app.use('/api/v1/thanksposts', thanksposts_1.thanksPostsRoutes);
const teams_1 = require("./routes/api/v1/teams");
app.use('/api/v1/teams', utils_1.verifyToken);
app.use('/api/v1/teams', teams_1.teamRoutes);
app.get('/', function (req, res) {
    res.send('Hello from server');
});
mongoose.connect(process.env.MONGOURI)
    .catch((err) => console.log(err));
app.listen(PORT, function () {
    console.log('Server running on localhost:' + PORT);
});
