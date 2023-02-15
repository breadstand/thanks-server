"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_1 = require("../models/user");
exports.userRoutes = (0, express_1.Router)();
exports.userRoutes.get('/:id', (req, res) => {
    user_1.UserObject.findById(req.userId)
        .then(user => {
        if (user) {
            user.password = '';
        }
        res.json({
            success: true,
            data: user
        });
    }).catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.userRoutes.put('/:id', (req, res) => {
    let options = {
        returnDocument: 'after',
    };
    user_1.UserObject.findByIdAndUpdate(req.userId, req.body, options)
        .then(user => {
        if (user) {
            user.password = '';
        }
        res.json({
            success: true,
            data: user
        });
    })
        .catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
