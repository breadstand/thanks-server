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
const users_1 = require("../../../services/users");
const Types = require('mongoose').Types;
exports.teamRoutes = (0, express_1.Router)();
exports.teamRoutes.get('/', (req, res) => {
    console.log('Not implemented yet');
    res.status(500).send('Internal server error');
});
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
exports.teamRoutes.get('/:teamid/pick-winners', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
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
