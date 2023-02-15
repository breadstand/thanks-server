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
const teams_1 = require("../services/teams");
exports.membershipRoutes = (0, express_1.Router)();
exports.membershipRoutes.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let memberships = [];
        // By default we will return the users memberships.
        // If a teamid is provided then we return team members
        if (req.query.teamid) {
            let teamId = req.query.teamid;
            memberships = yield (0, teams_1.getMemberships)(teamId);
            // Make sure user is on the team
            let foundUser = memberships.find((member) => {
                if (member.user == req.userId) {
                    return member;
                }
            });
            if (!foundUser) {
                res.status(401).send('Unauthorized request');
            }
        }
        else {
            memberships = yield teams.getUsersMemberships(req.userId);
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
        let ownerId = req.body.owner;
        let owner = yield teams.getMemberById(ownerId);
        if (owner.user != req.userId) {
            throw `User ${req.userId} is not ${owner.name}/${owner.user} `;
        }
        let newMember = yield teams.addMemberByContact(req.body.team, owner, req.body.name, req.body.contact);
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
        let memberid = req.params.id;
        let authorized = false;
        // Authorization requirements for updating (1 of 2 conditions):
        // 1. The user is an owner and the membership is part of the team
        let member = yield teams.getMember(memberid);
        let usersMembership = yield teams.getMemberByUserId(member.team, req.userId);
        if (usersMembership.owner) {
            authorized = true;
        }
        // 2. This is the user's membership and they are active
        if (member.user == req.userId) {
            authorized = true;
        }
        if (authorized) {
            let membership = yield teams.updateMember(memberid, update);
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
