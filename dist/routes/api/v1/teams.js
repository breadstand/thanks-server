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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRoutes = void 0;
const express_1 = require("express");
const team_1 = require("../../../models/team");
const teams_1 = require("../../../services/teams");
const posts_1 = require("../../../services/posts");
const users_1 = require("../../../services/users");
const post_1 = require("../../../models/post");
const bounty_1 = require("../../../models/bounty");
const Types = require('mongoose').Types;
const stripe_1 = __importDefault(require("stripe"));
let stripeKey = process.env.STRIPE_PRIVATE_KEY;
if (!stripeKey) {
    stripeKey = '';
}
const stripe = new stripe_1.default(stripeKey, {
    apiVersion: '2022-11-15',
});
exports.teamRoutes = (0, express_1.Router)();
function allowTeamOwnersOnly(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let teamid = new Types.ObjectId(req.params.id);
        req.team = yield (0, teams_1.getTeam)(teamid);
        if (!req.team) {
            return res.status(404).send('Team does not exist');
        }
        // Only team members can see the sets
        req.usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!((_a = req.usersMembership) === null || _a === void 0 ? void 0 : _a.owner)) {
            return res.status(401).send('You are not an owner of this team.');
        }
        next();
    });
}
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
exports.teamRoutes.post('/pick-winners-iris', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let results = yield (0, posts_1.pickWinners)();
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
exports.teamRoutes.put('/:teamid/prizes/:prizeid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let teamid = new Types.ObjectId(req.params.teamid);
        let prizeid = new Types.ObjectId(req.params.prizeid);
        let usersMembership = yield (0, teams_1.getMemberByUserId)(teamid, req.userId);
        if (!(usersMembership === null || usersMembership === void 0 ? void 0 : usersMembership.owner)) {
            return res.status(401).send("Unauthorized: You are not a team owner");
        }
        let prize = yield team_1.TeamPrizeObject.findById(prizeid);
        if (!prize) {
            return res.status(404).send("Cannot find that prize");
        }
        if (String(prize.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: prize belongs to a different team");
        }
        let update = req.body;
        if (req.body.hasOwnProperty('name')) {
            update.name = req.body.name;
        }
        if (req.body.hasOwnProperty('description')) {
            update.description = req.body.description;
        }
        if (req.body.hasOwnProperty('image')) {
            update.image = req.body.image;
        }
        if (req.body.hasOwnProperty('url')) {
            update.url = req.body.url;
        }
        if (req.body.hasOwnProperty('imageHeight')) {
            update.imageHeight = req.body.imageHeight;
        }
        if (req.body.hasOwnProperty('imageWidth')) {
            update.imageWidth = req.body.imageWidth;
        }
        let updatedPrize = yield team_1.TeamPrizeObject.findByIdAndUpdate(prizeid, { $set: update }, { new: true });
        res.json({
            success: true,
            error: '',
            data: updatedPrize
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
        bounty.createdBy = usersMembership._id;
        yield bounty.save();
        res.json({
            success: true,
            error: '',
            data: bounty
        });
        let subject = 'New Bounty';
        let body = `${usersMembership.name} created a new bounty called: ${bounty.name}.`;
        body += ` ${bounty.description}`;
        if (bounty.reward) {
            body += ` Reward: ${bounty.reward}`;
        }
        body += ` Do you have any ideas? .https://thanks.breadstand.us.`;
        (0, teams_1.notifyTeam)(teamid, subject, body);
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
        let body = `${usersMembership.name} is looking for ideas for: ${bounty.name}.`;
        if (bounty.reward) {
            body += ` Reward: ${bounty.reward}`;
        }
        body += ` Do you have any? Go to https://thanks.breadstand.us/ to submit some ideas.`;
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
exports.teamRoutes.get('/:id/payment_methods', allowTeamOwnersOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let stripeCustomerId = yield (0, teams_1.getStripeCustomerId)(req.team);
        let results = yield Promise.all([
            stripe.customers.retrieve(req.team.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: req.team.stripeCustomerId,
                type: 'card',
            })
        ]);
        let customer = results[0];
        let defaultPaymentMethod = '';
        let paymentMethods = results[1];
        let numberOfPaymentMethods = paymentMethods.data.length;
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method;
        }
        // If only one payment mehtod, set it as the default
        if (numberOfPaymentMethods == 1) {
            defaultPaymentMethod = paymentMethods.data[0].id;
            yield stripe.customers.update(req.team.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: defaultPaymentMethod
                }
            });
        }
        return res.json({
            success: true,
            data: {
                paymentMethods: paymentMethods.data,
                defaultPaymentMethod: defaultPaymentMethod,
                numberOfPaymentMethods: numberOfPaymentMethods
            }
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.get('/:id/payment_methods/secret', allowTeamOwnersOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let setupIntent = yield stripe.setupIntents.create({
            customer: req.team.stripeCustomerId,
            payment_method_types: ['card'],
        });
        res.json({
            client_secret: setupIntent.client_secret
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.post('/:id/payment_methods/:methodid/make_default', allowTeamOwnersOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let customer = yield stripe.customers.update(req.team.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: req.params.methodid
            }
        });
        let defaultPaymentMethod = '';
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method;
        }
        res.json({
            success: true,
            data: {
                defaultPaymentMethod: defaultPaymentMethod,
            }
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.delete('/:id/payment_methods/:methodid', allowTeamOwnersOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let paymentMethod = yield stripe.paymentMethods.retrieve(req.params.methodid);
        if (paymentMethod.customer != req.team.stripeCustomerId) {
            return res.status(401).send('User does not own this method');
        }
        yield stripe.paymentMethods.detach(req.params.methodid);
        let results = yield Promise.all([
            stripe.customers.retrieve(req.team.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: req.team.stripeCustomerId,
                type: 'card',
            })
        ]);
        let customer = results[0];
        console.log(customer);
        let defaultPaymentMethod = '';
        let paymentMethods = results[1];
        let numberOfPaymentMethods = paymentMethods.data.length;
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method;
        }
        return res.json({
            success: true,
            data: {
                paymentMethods: paymentMethods.data,
                defaultPaymentMethod: defaultPaymentMethod,
                numberOfPaymentMethods: numberOfPaymentMethods
            }
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.teamRoutes.put('/:id/price', allowTeamOwnersOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let pricingPlans = [process.env.STRIPE_DEFAULT_PLAN, process.env.STRIPE_PAID_PLAN];
        let newPrice = req.body.price;
        // Make sure plan is a valid plan
        if (!pricingPlans.includes(newPrice)) {
            return res.status(401).send("Invalid pricing plan");
        }
        let subscriptionId = yield (0, teams_1.getStripeSubscriptionId)(req.team);
        console.log(subscriptionId);
        let subscription = yield stripe.subscriptions.retrieve(subscriptionId);
        let memberships = yield (0, teams_1.getMemberships)(req.team.id);
        let quantity = memberships.length;
        if (subscription.items.data.length > 0) {
            let currentItem = subscription.items.data[0].id;
            let currentPrice = subscription.items.data[0].plan.id;
            if (currentPrice == newPrice) {
                return res.json({
                    success: true,
                    data: newPrice
                });
            }
            let result = yield stripe.subscriptions.update(subscriptionId, { items: [{ price: newPrice, quantity: quantity }, { id: currentItem, deleted: true }] });
            req.team.pricingPlan = newPrice;
            req.team.save();
            console.log(req.team);
            return res.json({
                success: true,
                data: newPrice
            });
        }
        else {
            yield stripe.subscriptions.update(subscriptionId, { items: [{ price: newPrice, quantity: quantity }] });
            req.team.pricingPlan = newPrice;
            req.team.save();
            return res.json({
                success: true,
                data: newPrice
            });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
/*
userRoutes.get('/:userid/paymentmethods/add',
    security.allowUserOnly,async(req,res) => {
    try {
        return utils.renderPage(req,res,'users/paymentmethods/add.pug',{
            userBeingViewed: req.userBeingViewed
        });
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }

});

userRoutes.post('/:userid/paymentmethods/add',
    security.allowUserOnly,async (req,res) => {
    try {
        let stripeCustomerId = await users.getStripeCustomerId(req.userBeingViewed);
        let paymentMethod = await stripe.paymentMethods.attach(req.body.paymentMethod,
            {customer: stripeCustomerId});
        let customer = await stripe.customers.update(stripeCustomerId,{
            invoice_settings: {
                default_payment_method: paymentMethod.id
            }
        });
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch(e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.get('/:userid/paymentmethods/add-bank-account',
    security.allowUserOnly,async(req,res) => {
    try {
        
        let errors = [];
        if (req.session.errors) {
            errors = req.session.errors;
            delete req.session.errors;
        }
        let formValues = {};
        if (req.session.formValues) {
            formValues = req.session.formValues;
            delete req.session.formValues;
        }

        return utils.renderPage(req,res,'users/paymentmethods/add-bank-account.pug',{
            formValues: formValues,
            errors: errors
        });
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }

});

userRoutes.post('/:userid/paymentmethods/add-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        let stripeCustomerId = await users.getStripeCustomerId(req.userBeingViewed);
        //console.log(req.body);
        let result = await stripe.customers.createSource(stripeCustomerId,
            {
                source: {
                    object: 'bank_account',
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: req.body.account_holder_name,
                    account_holder_type: req.body.account_holder_type,
                    routing_number: req.body.routing_number,
                    account_number: req.body.account_number
                }
            }
          );
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch(e) {
        if (e.type == 'StripeInvalidRequestError') {
            req.session.errors = [{msg: e.raw.message}];
            req.session.formValues = req.body;
            return res.redirect(`/users/${req.params.userid}/paymentmethods/add-bank-account`);
        }
        return utils.goToErrorPage(req,res,e);
    }
});

userRoutes.post('/:userid/paymentmethods/:paymentmethodid/delete',
    security.allowUserOnly,async (req,res) => {
    try {
        await stripe.paymentMethods.detach(req.params.paymentmethodid);
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});

userRoutes.post('/:userid/paymentmethods/:paymentmethodid/delete-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        await stripe.customers.deleteSource(
            req.userBeingViewed.stripeCustomerId,
            req.params.paymentmethodid);
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.post('/:userid/paymentmethods/:paymentmethodid/make-default',
    security.allowUserOnly,async (req,res) => {
    try {
        let customer = await stripe.customers.update(req.userBeingViewed.stripeCustomerId,{
            invoice_settings: {
                default_payment_method: req.params.paymentmethodid
            }});
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.post('/:userid/paymentmethods/:paymentmethodid/make-default-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        let customer = await stripe.customers.update(req.userBeingViewed.stripeCustomerId,{
            default_source: req.params.paymentmethodi,
            invoice_settings: {
                default_payment_method: null
            }});
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.get('/:userid/paymentmethods/:paymentmethodid/verify-bank-account',
    security.allowUserOnly,async(req,res) => {
    try {
        let errors = [];
        if (req.session.errors) {
            errors = req.session.errors;
            delete req.session.errors;
        }

        return utils.renderPage(req,res,'users/paymentmethods/verify-bank-account.pug',{
            paymentMethodId: req.params.paymentmethodid,
            errors: errors
        });
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }

});

userRoutes.post('/:userid/paymentmethods/:paymentmethodid/verify-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        let stripeCustomerId = await users.getStripeCustomerId(req.userBeingViewed);
        //console.log(req.body);

        amount1 = parseInt(req.body.amount1);
        amount2 = parseInt(req.body.amount2);
        let result = await stripe.customers.verifySource(
            stripeCustomerId,
            req.params.paymentmethodid,
            { amounts: [amount1, amount2]});

        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch(e) {
        if (e.type == 'StripeInvalidRequestError') {
            req.session.errors = [{msg: e.raw.message}];
            return res.redirect(`/users/${req.params.userid}/paymentmethods/${req.params.paymentmethodid}/verify-bank-account`);
        }
        
        return utils.goToErrorPage(req,res,e);
    }
});
*/ 
