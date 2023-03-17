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
Object.defineProperty(exports, "__esModule", { value: true });
exports.thanksPostsRoutes = void 0;
const express_1 = require("express");
const teams_1 = require("../../../services/teams");
const thanks_1 = require("../../../services/thanks");
const Types = require('mongoose').Types;
exports.thanksPostsRoutes = (0, express_1.Router)();
exports.thanksPostsRoutes.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // We only want authorized team members to see the posts
        let teamId = new Types.ObjectId(req.query.team);
        let member = yield (0, teams_1.getMemberByUserId)(teamId, req.userId);
        if (!member) {
            throw "User is not a member of team";
        }
        let thanksPosts = yield (0, thanks_1.getThanksPosts)(teamId, null);
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
exports.thanksPostsRoutes.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('thanksPost');
        console.log(req.body);
        let thanksPost = yield (0, thanks_1.createThanks)(req.body.team, req.body.createdBy, req.body.thanksTo, req.body.thanksFor);
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
