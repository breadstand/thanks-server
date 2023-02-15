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
const express = require('express');
const router = express.Router();
const { safeCopy } = require('../../../utils/utils');
const users = require('../../../dist/services/users');
router.get('/', (req, res) => {
    console.log('Not implemented yet');
    res.status(500).send('Internal server error');
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield users.getUser(req.userId);
        let results = yield teams.createTeam(user);
        let team = results[0];
        res.json({
            success: true,
            data: team
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
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
router.put('/:id', (req, res) => {
    let options = {
        returnDocument: 'after',
    };
    let postUpdate = req.body;
    delete postUpdate._id;
    delete postUpdate.user;
    Post.findOneAndUpdate({ _id: req.params.id, user: req.userId }, postUpdate, options)
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
module.exports = router;
