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
const thanks = require('../../../services/thanks');
const teams = require('../../../dist/services/teams');
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // We only want authorized team members to see the posts
        let member = yield teams.getMemberByUserId(req.query.team, req.userId);
        if (!member) {
            throw "User is not a member of team";
        }
        let thanksPosts = yield thanks.getThanksPosts(req.query.team);
        res.json({
            success: true,
            data: thanksPosts
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(req.body);
        let thanksPost = yield thanks.createThanks(req.body.team, req.body.createdBy, req.body.thanksTo, req.body.thanksFor);
        res.json({
            success: true,
            data: thanksPost
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
}));
module.exports = router;
