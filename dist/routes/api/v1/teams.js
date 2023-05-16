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
exports.teamRoutes = void 0;
const express_1 = require("express");
const teams_1 = require("../../../services/teams");
const posts_1 = require("../../../services/posts");
const users_1 = require("../../../services/users");
const post_1 = require("../../../models/post");
const bounty_1 = require("../../../models/bounty");
const Types = require('mongoose').Types;
exports.teamRoutes = (0, express_1.Router)();
exports.teamRoutes.get('/:teamid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let member = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(member === null || member === void 0 ? void 0 : member.owner)) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.");
        }
        let team = yield (0, teams_1.getTeam)(teamid);
        res.json({
            success: true,
            error: '',
            data: team
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield (0, users_1.getUser)(req.userId);
        if (!user) {
            return res.json({
                success: false,
                error: "It looks like you don't exist?",
                data: {}
            });
        }
        var usersteams = yield (0, teams_1.getUsersMemberships)(user._id);
        if (usersteams.length >= 50) {
            return res.json({
                success: false,
                error: 'You appear to be on too many teams.',
                data: {}
            });
        }
        let results = yield (0, teams_1.createTeam)(user);
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
exports.teamRoutes.put('/:teamid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let member = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        let update = req.body;
        if (!(member === null || member === void 0 ? void 0 : member.owner)) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.");
        }
        let team = yield (0, teams_1.updateTeam)(teamid, update);
        res.json({
            success: true,
            error: '',
            data: team
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.delete('/:teamid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let member = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(member === null || member === void 0 ? void 0 : member.owner)) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.");
        }
        let team = yield (0, teams_1.deleteTeam)(teamid);
        res.json({
            success: true,
            error: ''
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.get('/:id/prizes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.id);
        // Only team members can see the prizes
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!usersMembership) {
            return res.json({
                success: false,
                error: "Unauthorized: You are not a member of this team.",
                data: []
            });
        }
        let prizes = yield (0, teams_1.availablePrizes)(teamid);
        res.json({
            success: true,
            error: '',
            data: prizes
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.post('/:teamid/prizes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let prize = req.body;
        let missingFields = [];
        if (!prize.team) {
            missingFields.push('team');
        }
        if (!prize.createdBy) {
            missingFields.push('createdBy');
        }
        if (!prize.name) {
            missingFields.push('name');
        }
        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: ' + missingFields.join(', '),
                data: prize
            });
        }
        if (String(prize.team) != String(teamid)) {
            return res.json({
                success: false,
                error: `Team: ${prize.team} does not match url team: ${teamid}`,
                data: prize
            });
        }
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.json({
                success: false,
                error: 'You are not a team owner',
                data: prize
            });
        }
        let savedPrize = yield (0, teams_1.createPrize)(prize);
        res.json({
            success: true,
            error: '',
            data: savedPrize
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.post('/:teamid/pick-winners', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let dryRun = true;
        if (!req.body.dryRun) {
            dryRun = false;
        }
        console.log('dryRun', dryRun);
        let teamid = new Types.ObjectId(req.params.teamid);
        // Check the user is a team owner
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send("Unauthorized: You are not a team owner");
        }
        let results = yield (0, posts_1.pickTeamWinners)(teamid, 0, dryRun);
        res.json({
            success: true,
            error: '',
            data: results
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.delete('/:teamid/prizes/:prizeid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let prizeid = new Types.ObjectId(req.params.prizeid);
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send("Unauthorized: You are not a team owner");
        }
        yield (0, teams_1.deactivePrize)(prizeid);
        res.json({
            success: true,
            error: '',
            data: {}
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.get('/:id/bounties', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.id);
        // Only team members can see the prizes
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!usersMembership) {
            return res.status(401).send("Unauthorized: You are not a member of this team.");
        }
        let bounties = yield bounty_1.BountyObject.find({ team: teamid, active: true })
            .populate('createdBy')
            .populate({
            path: 'ideas',
            populate: {
                path: 'createdBy',
                model: 'membership'
            }
        })
            .sort({ name: 1 });
        res.json({
            success: true,
            error: '',
            data: bounties
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.post('/:teamid/bounties', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let bounty = new bounty_1.BountyObject(req.body);
        let missingFields = [];
        if (!bounty.team) {
            missingFields.push('team');
        }
        if (!bounty.createdBy) {
            missingFields.push('createdBy');
        }
        if (!bounty.name) {
            missingFields.push('name');
        }
        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: ' + missingFields.join(', '),
                data: bounty
            });
        }
        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty posted to the wrong URL");
        }
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send("Unauthorized: You are not a team owner");
        }
        yield bounty.save();
        res.json({
            success: true,
            error: '',
            data: bounty
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.put('/:teamid/bounties/:bountyid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let bountyid = new Types.ObjectId(req.params.bountyid);
        let update = req.body;
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send("Unauthorized: You are not a team owner");
        }
        let bounty = yield bounty_1.BountyObject.findById(bountyid);
        if (!bounty) {
            return res.status(404).send("Cannot find that bounty");
        }
        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty posted to the wrong URL");
        }
        let updatedBounty = yield bounty_1.BountyObject.findByIdAndUpdate(bountyid, { $set: update }, { new: true });
        res.json({
            success: true,
            error: '',
            data: updatedBounty
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.put('/:teamid/bounties/:bountyid/remindMembers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let bountyid = new Types.ObjectId(req.params.bountyid);
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send("Unauthorized: You are not a team owner");
        }
        let bounty = yield bounty_1.BountyObject.findById(bountyid);
        if (!bounty) {
            return res.status(404).send("No such bounty");
        }
        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty does not belong to team");
        }
        let subject = 'Bounty Reminder!';
        let body = `${usersMembership.name} is looking for ideas for: ${bounty.name}. Do you have any? Go to https://thanks-a919c.web.app/ to submit some ideas.`;
        (0, teams_1.notifyTeam)(teamid, subject, body);
        res.json({
            success: true,
            error: ''
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.get('/:id/sets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.id);
        // Only team members can see the sets
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!usersMembership) {
            return res.status(401).send('You are not a member of this team.');
        }
        let sets = yield post_1.ThanksSetObject.find({ team: teamid });
        res.json({
            success: true,
            error: '',
            data: sets
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.get('/:id/getNextSet', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.id);
        // Only team members can see the sets
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send('You are not an owner of this team.');
        }
        let team = yield (0, teams_1.getTeam)(teamid);
        if (!team) {
            return res.status(404).send('Team not found');
        }
        let dateRange = yield (0, posts_1.figureOutDateRange)(team);
        let sets = yield post_1.ThanksSetObject.find({ team: teamid });
        res.json({
            success: true,
            error: '',
            data: [
                {
                    _id: '',
                    created: new Date(),
                    team: teamid,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }
            ]
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.get('/:id/testPickingWinners', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.id);
        // Only team members can see the sets
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send('You are not an owner of this team.');
        }
        let team = yield (0, teams_1.getTeam)(teamid);
        if (!team) {
            return res.status(404).send('Team not found');
        }
        let dateRange = yield (0, posts_1.figureOutDateRange)(team);
        res.json({
            success: true,
            error: '',
            data: [
                {
                    _id: '',
                    created: new Date(),
                    team: teamid,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }
            ]
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
