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
exports.membershipRoutes = void 0;
const express_1 = require("express");
const teams_1 = require("../../../services/teams");
const Types = require('mongoose').Types;
exports.membershipRoutes = (0, express_1.Router)();
exports.membershipRoutes.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let memberships = [];
        // By default we will return the users memberships.
        // If a teamid is provided then we return team members
        if (req.query.teamid) {
            let teamId = new Types.ObjectId(req.query.teamid);
            memberships = yield (0, teams_1.getMemberships)(teamId);
            // Make sure user is on the team
            let foundUser = memberships.find((member) => (String(member.user) == String(req.userId)));
            if (!foundUser) {
                return res.status(401).send('Unauthorized request');
            }
        }
        else {
            memberships = yield (0, teams_1.getUsersMemberships)(req.userId);
        }
        res.json({
            success: true,
            data: memberships
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.membershipRoutes.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let member = yield (0, teams_1.getMemberByUserId)(req.body.team, req.userId);
        if (!member || !member.owner) {
            return res.status(401).send('Only team owners can add members');
        }
        let newMember = yield (0, teams_1.addMemberByContact)(req.body.team, member, req.body.name, req.body.contacts[0].contact, req.body.contacts[0].contactType);
        res.status(200).send({
            success: true,
            data: newMember
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.membershipRoutes.get('/:id', (req, res) => {
    res.status(500).send('Internal server error');
    /*
    Post.findById(req.params.id)
    .then( post => {
        res.json({
            success: true,
            data: post
        })
    }).catch(err => {
        console.log(err)
        res.status(500).send('Internal server error')
    })*/
});
exports.membershipRoutes.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let update = req.body;
        let memberid = new Types.ObjectId(req.params.id);
        let authorized = false;
        // Authorization requirements for updating (1 of 2 conditions):
        // 1. The user is an owner and the membership is part of the team
        let member = yield (0, teams_1.getMemberById)(memberid);
        let usersMembership = yield (0, teams_1.getMemberByUserId)(member.team, req.userId);
        if (usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner) {
            authorized = true;
        }
        // 2. This is the user's membership and they are active
        if (String(member.user) == String(req.userId)) {
            authorized = true;
        }
        if (authorized) {
            let membership = yield (0, teams_1.updateMember)(memberid, update);
            res.json({
                success: true,
                data: [membership]
            });
        }
        else {
            console.log('Unauthorized');
            res.status(401).send('User is not the member or is not a team owner');
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.membershipRoutes.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let memberid = new Types.ObjectId(req.params.id);
        let authorized = false;
        // Authorization requirements for updating (1 of 2 conditions):
        // 1. The user is an owner and the membership is part of the team
        let member = yield (0, teams_1.getMemberById)(memberid);
        let usersMembership = yield (0, teams_1.getMemberByUserId)(member.team, req.userId);
        if (usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner) {
            authorized = true;
        }
        if (authorized) {
            let membership = yield (0, teams_1.deactivateMember)(memberid);
            res.json({
                success: true,
                data: membership
            });
        }
        else {
            return res.json({
                success: false,
                error: 'Unauthorized: You are not a team owner',
                data: {}
            });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
