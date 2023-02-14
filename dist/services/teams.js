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
const membership_1 = require("../models/membership");
const team_1 = require("../models/team");
const smtp = require('../../services/smtp');
const sms = require('../../services/sms');
const utils = require('../../services/utils');
const users = require('../../dist/services/users');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY, {
    apiVersion: process.env.STRIPE_API_VERSION
});
const cryptoRandomString = require('crypto-random-string');
const { phone } = require('phone');
const maxteams = 50;
function getDateDaysAgo(daysago) {
    var created = new Date();
    created.setDate(created.getDate() - daysago);
    let month = created.getMonth();
    let year = created.getFullYear();
    let day = created.getDate();
    created = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return created;
}
function standardizePhone(number) {
    var p = phone(number);
    var standardized_phone = p[0];
    if (standardized_phone) {
        return standardized_phone;
    }
    else {
        return undefined;
    }
}
/*
Adds users to a team.

teamid: objectid of the team
owner (Membership object):
    These are the name and contact information for the person who added
    the user to the team. When a users is added to a team, we will
    send them a text message or email to tell them that the are part of the
    team. In this age of spam and for security, users might be cautious
    to respond to the text or email. By providing the ownername and contact
    information, this gives credibility to the message.
membership_email: the way to contact/message the user (email address or mobile number)


We have a couple of situations:
1. A corporation may add users. They may want to control notifications. Users
    can only interact with corporate approved accounts. So a corporation is not
    going to like a user adding or changing or adjust contact information.
    So contact information cannot be altered.
2. A regular person, like a PTA member, might want to use the system.
    They will not really care about notifications or control or security. Users can
    do what they like.

*/
function addMemberByContact(teamid, owner, name, contact) {
    return __awaiter(this, void 0, void 0, function* () {
        var n = utils.sanitizeName(name);
        var e = utils.sanitizeEmail(contact);
        var p = utils.sanitizePhone(contact);
        if (!n) {
            return null;
        }
        if (!e && !p) {
            return null;
        }
        var membership = undefined;
        let teamMember = null;
        // See if the user already exists
        if (e) {
            teamMember = yield membership_1.MembershipObject.findOne({
                team: teamid,
                email: e
            });
        }
        else if (p) {
            teamMember = yield membership_1.MembershipObject.findOne({
                team: teamid,
                phone: p
            });
        }
        // If they do, make sure they are active.
        if (teamMember) {
            teamMember.active = true;
            teamMember.name = n;
        }
        // If not, then add the member
        else {
            teamMember = new membership_1.MembershipObject({
                team: teamid,
                email: e,
                phone: p,
                name: n,
                active: true,
            });
        }
        // If the member does not have a user associated
        // see if we can associate them
        if (!teamMember.user && e) {
            var user = yield users.findUserByEmail(e);
            if (user) {
                teamMember.user = user._id;
            }
        }
        yield teamMember.save();
        yield sendInvitation(teamMember, owner);
        yield updateMemberCount(teamid);
        return teamMember;
    });
}
// This is when we already have access to the user object, and not just the email
function addMember(teamid, user) {
    return __awaiter(this, void 0, void 0, function* () {
        var newteamMember = undefined;
        // See if the user already exists
        var teamMember = yield membership_1.MembershipObject.findOne({
            team: teamid,
            user: user._id
        });
        let phone = null;
        let email = null;
        if (user.contacts.length) {
            if (user.contacts[0].contactType == 'phone') {
                phone = user.contacts[0].contact;
            }
            if (user.contacts[0].contactType == 'email') {
                email = user.contacts[0].contact;
            }
        }
        // If they do, make sure they are active.
        if (teamMember) {
            teamMember.active = true;
            teamMember.name = user.name;
            teamMember.email = email;
            teamMember.phone = phone;
        }
        // If not, then add the member
        else {
            teamMember = new membership_1.MembershipObject({
                team: teamid,
                user: user._id,
                name: user.name,
                email: email,
                phone: phone,
                active: true
            });
        }
        yield teamMember.save();
        yield updateMemberCount(teamid);
        return teamMember;
    });
}
function getUsersMemberships(userid) {
    return membership_1.MembershipObject.find({
        user: userid,
        active: true
    })
        .populate({
        path: 'team'
    })
        .sort({
        "team.name": 1
    });
}
function createTeamName(user) {
    return __awaiter(this, void 0, void 0, function* () {
        var usersteams = yield getUsersMemberships(user._id);
        if (usersteams.length >= maxteams) {
            throw "Users can only be on " + maxteams + " teams";
        }
        var teamnumber = 1;
        var teamName = user.name + "'s Team";
        while (teamnumber < maxteams) {
            var nametofind = teamName;
            if (teamnumber > 1) {
                nametofind += " #" + teamnumber;
            }
            let match = usersteams.find(element => element.team.name == nametofind);
            if (!match) {
                return nametofind;
            }
            teamnumber++;
        }
        return null;
    });
}
/*
createTeam(user);
Creates a new team. The initial name of the team is "Untitled Team".
The userid is added to the team, and marked as the owner.
The contact is the email/phone of the person creating the team. It can
be either and email or phone, and this will figure out the difference.
The contact is important because it helps identify the primary way the
user is to be contacted in regards to the time.

user: User Object

Returns: result array
results[0] Membership object
results[1]
*/
function createTeam(user, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!options.teamName) {
            options.teamName = yield createTeamName(user);
        }
        // Create a team
        let team = new team_1.TeamObject({
            name: options.teamName,
            members: 1
        });
        /*
        if (process.env.THANKS_BACKDATE_DAYS) {
          let daysAgo = Number(process.env.THANKS_BACKDATE_DAYS);
          team.created = getDateDaysAgo(daysAgo);
        }*/
        let membership = new membership_1.MembershipObject({
            team: team._id,
            user: user._id,
            name: user.name,
            owner: true,
            active: true
        });
        return Promise.all([team.save(), membership.save()]);
    });
}
//
// Basically what this does it make a list of members for  team.
// A user can have many profiles. The same user might be on Facebook, Google, Twitter, etc.
// One of those types of profiles is that they might belong to a team. When they do
// they have a team profile. From a user's perspective the think about all of their accounts
// (or profiles). From a team's perspective, the think of all their users. To make this
// easier, getMembers() will basically take the profile of users which is a member of the 
// team and make a list out of them. Basically getMembers() returns a list of each users profile
// for this team. 
function getNewMembers(teamid) {
    return membership_1.MembershipObject.find({
        team: teamid,
        active: true
    })
        .sort({
        _id: -1
    })
        .limit(5);
}
function getMember(memberid) {
    return membership_1.MembershipObject.findOne({
        _id: memberid,
        active: true
    }).populate('user');
}
function getMemberByUserId(teamid, userid) {
    return membership_1.MembershipObject.findOne({
        team: teamid,
        user: userid,
        active: true
    });
}
function getMemberships(teamid) {
    return membership_1.MembershipObject.find({
        team: teamid,
        active: true
    })
        .sort({
        name: 1,
        email: 1
    });
}
function getMemberByEmail(teamid, email) {
    var standardized_email = utils.sanitizeEmail(email);
    return membership_1.MembershipObject.findOne({
        team: teamid,
        email: standardized_email,
        active: true
    });
}
function findMemberByContact(teamid, contact) {
    var email = utils.sanitizeEmail(contact);
    //var phone = teams.standardizePhone(contact);
    if (email) {
        return membership_1.MembershipObject.findOne({
            team: teamid,
            email: email,
            active: true
        });
    }
    //if (phone) {
    //  return Membership.findOne({
    //    team: teamid,
    //    phone: phone
    //  });
    //}
    return null;
}
function adjustSentCount(teamid, count) {
    return team_1.TeamObject.findByIdAndUpdate(teamid, {
        $inc: {
            sent: count
        }
    }, {
        new: true
    });
}
;
function updateMemberCount(teamid) {
    return membership_1.MembershipObject.countDocuments({
        team: teamid,
        active: true
    })
        .then((member_count) => {
        return team_1.TeamObject.findByIdAndUpdate(teamid, {
            $set: {
                members: member_count
            }
        }, {
            new: true
        });
    });
}
function deactivateMember(memberId) {
    return __awaiter(this, void 0, void 0, function* () {
        var member = yield membership_1.MembershipObject.findOneAndUpdate({
            _id: memberId,
            owner: false
        }, {
            $set: {
                active: false
            }
        }, {
            new: true
        });
        if (!member) {
            return null;
        }
        yield updateMemberCount(member.team);
        return member;
    });
}
;
function notifyMember(memberId, subject, body) {
    return __awaiter(this, void 0, void 0, function* () {
        var teamMember = yield getMember(memberId);
        for (let i = 0; i < teamMember.contacts.length; i++) {
            let contact = teamMember.contacts[i];
            if (contact.contactType == 'phone') {
                yield sms.send(contact.contact, body);
            }
            if (contact.contactType == 'email') {
                yield smtp.send(contact.contact, subject, body);
            }
        }
    });
}
//
// Find any memberships that have the same contacts as this
// user and then associate the user with them.
function updateUsersMemberships(user) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < user.contacts.length; i++) {
            let contact = user.contacts[i];
            let members = yield membership_1.MembershipObject.find({
                "contact.contact": contact,
                active: true
            });
            for (let m = 0; m < members.length; m++) {
                let member = members[m];
                member.user = user._id;
                yield member.save();
            }
        }
    });
}
;
function addDefaultOwner(teamId) {
    return __awaiter(this, void 0, void 0, function* () {
        let members = yield getMemberships(teamId);
        return membership_1.MembershipObject.findByIdAndUpdate(members[0]._id, { owner: true });
    });
}
function sendInvitation(teamMember, owner) {
    if (!owner.contacts.length) {
        return;
    }
    var subject = "Invitation to Join th8nks";
    var body = "This is an automated message from Breadstand's Thanks Program.";
    body += `${owner.name} (${owner.contacts[0].contact}) would like you to join the thanks program.`;
    body += " To get started, visit: \n";
    body += 'https://www.th8nks.com/thanks/?memberid=' + teamMember;
    body += "\n";
    body += "Thank you. We hope you have a great day.";
    return notifyMember(teamMember, subject, body);
}
function notifyTeam(teamid, subject, body) {
    return __awaiter(this, void 0, void 0, function* () {
        yield getMemberships(teamid)
            .then((members) => {
            members.forEach((member) => __awaiter(this, void 0, void 0, function* () {
                yield notifyMember(member._id, subject, body);
            }));
        });
    });
}
function notifyOwners(teamid, subject, body) {
    return __awaiter(this, void 0, void 0, function* () {
        yield getOwners(teamid)
            .then(members => {
            members.forEach((member) => __awaiter(this, void 0, void 0, function* () {
                yield notifyMember(member._id, subject, body);
            }));
        });
    });
}
function getTeam(teamid) {
    return team_1.TeamObject.findById(teamid);
}
function getOwners(teamid) {
    return membership_1.MembershipObject.find({
        team: teamid,
        owner: true,
        active: true
    });
}
function getStripeCustomerId(team) {
    return new Promise((resolve, reject) => {
        if (team.stripeCustomerId) {
            return resolve(team.stripeCustomerId);
        }
        var description = `${team.name} ${team._id.toString()}`;
        return stripe.customers.create({
            description: description
        })
            .then((result) => {
            team.stripeCustomerId = result.id;
            return team_1.TeamObject.findByIdAndUpdate(team._id, { stripeCustomerId: result.id });
        }).then((team) => {
            return resolve(team.stripeCustomerId);
        }).catch((err) => {
            reject(err);
        });
    });
}
;
/*
  Determines the day of the month on which to create a bill.
  In months where there day of the month is greater than
  the number of days, the last day will be used.

  team: Team
  dateToBill: the billing date. Defaults to now.
*/
/*
function getBillDay(team,dateToBill=new Date()) {
    let effectiveBillDay = team.billday;
    if (!effectiveBillDay) {
        effectiveBillDay = team.created.getDay();
    }
    // Figure out the number of days in the month
    let month = dateToBill.getMonth();
    let year = dateToBill.getFullYear();
    let endOfMonth = new Date(year,month+1,0);
    let numberOfDays = endOfMonth.getDate();
    if (numberOfDays < effectiveBillDay) {
        effectiveBillDay = numberOfDays;
    }
    return effectiveBillDay
}
*/
/*
shouldBill(team,billingdate);
*/
function importMembers(teamid, owner, text) {
    return __awaiter(this, void 0, void 0, function* () {
        var list = text.split("\n");
        var imported = [];
        var rejected = [];
        for (var i = 0; i < list.length; i++) {
            let lineitem = list[i];
            // Should be able to split by both spaces and tabs.
            var lastspace = lineitem.lastIndexOf(" ");
            var lasttab = lineitem.lastIndexOf('\t');
            if (lasttab > lastspace) {
                lastspace = lasttab;
            }
            if (lastspace < 0) {
                rejected.push(lineitem);
                continue;
            }
            let name = lineitem.slice(0, lastspace).trim();
            let contact = lineitem.slice(lastspace).trim();
            var m = yield addMemberByContact(teamid, owner, name, contact);
            if (m) {
                imported.push(name);
            }
            else {
                rejected.push(list[i]);
            }
        }
        ;
        return [imported, rejected];
    });
}
function createBounty(teamid, name, amount) {
    var bounty = new team_1.TeamBountyObject({
        team: teamid,
        name: utils.sanitizeName(name),
        amount: amount
    });
    return bounty.save();
}
;
function getBounties(teamid, active = true) {
    var query = {
        team: teamid,
        active: active
    };
    return team_1.TeamBountyObject.find(query)
        .sort({
        name: 1
    });
}
function getBounty(bountyid) {
    return team_1.TeamBountyObject.findById(bountyid);
}
function activateBounty(bountyid) {
    return team_1.TeamBountyObject.findByIdAndUpdate(bountyid, {
        $set: {
            active: true
        }
    }, {
        new: true
    });
}
function deactivateBounty(bountyid) {
    return team_1.TeamBountyObject.findByIdAndUpdate(bountyid, {
        $set: {
            active: false
        }
    }, {
        new: true
    });
}
function updateBounty(bountyid, update) {
    return __awaiter(this, void 0, void 0, function* () {
        if (update.name) {
            update.name = utils.sanitizeName(update.name);
        }
        if (update.active !== undefined) {
            throw "Active status can only be updated through deactivateBounty()";
        }
        var bounty = yield team_1.TeamBountyObject.findByIdAndUpdate(bountyid, {
            $set: update
        }, { new: true });
        return bounty;
    });
}
function incrementSentCount(memberid, count = 1) {
    return membership_1.MembershipObject.findByIdAndUpdate(memberid, {
        $inc: {
            sent: count
        }
    }, {
        new: true
    });
}
function incrementReceivedCount(memberid, count = 1) {
    return membership_1.MembershipObject.findByIdAndUpdate(memberid, {
        $inc: {
            received: count
        }
    }, {
        new: true
    });
}
function incrementIdeaCount(memberid, count = 1) {
    return membership_1.MembershipObject.findByIdAndUpdate(memberid, {
        $inc: {
            ideas: count
        }
    }, {
        new: true
    });
}
function updateTeam(teamid, update) {
    if (update.name) {
        update.name = update.name.slice(0, 40).trim();
    }
    return team_1.TeamObject.findByIdAndUpdate(teamid, {
        $set: update
    }, {
        new: true
    });
}
function resetMember(member) {
    return __awaiter(this, void 0, void 0, function* () {
        yield membership_1.MembershipObject.findById(member._id, { user: null });
    });
}
function updateMember(memberid, update) {
    //Update to allow removal of email or phone
    let name = utils.sanitizeName(update.name);
    if (name) {
        update.name = name;
    }
    update.details = update.details.slice(0, 80).trim();
    update.contacts.forEach(contact => {
        if (contact.contactType == 'email') {
            contact.contact = utils.sanitizeEmail(contact.contact);
        }
        if (contact.contactType == 'phone') {
            contact.contact = utils.sanitizePhone(contact.contact);
        }
    });
    return membership_1.MembershipObject.findByIdAndUpdate(memberid, update);
}
function setMemberPrivileges(memberid, privileges) {
    var update = {
        owner: false
    };
    if (privileges[0] == 'owner') {
        update.owner = true;
    }
    return membership_1.MembershipObject.findByIdAndUpdate(memberid, { active: true, owner: true }, { new: true });
}
function deleteTeam(teamid) {
    return __awaiter(this, void 0, void 0, function* () {
        var team = yield team_1.TeamObject.findById(teamid);
        if (!team) {
            return null;
        }
        var jobs = [];
        jobs.push(team_1.TeamObject.findByIdAndDelete(teamid));
        jobs.push(membership_1.MembershipObject.deleteMany({ team: teamid }));
        jobs.push(team_1.TeamBountyObject.deleteMany({ team: teamid }));
        jobs.push(team_1.TeamPrizeObject.deleteMany({ team: teamid }));
        yield Promise.all(jobs);
    });
}
function forEach(func) {
    return __awaiter(this, void 0, void 0, function* () {
        var processed = 0;
        yield team_1.TeamObject.find({ active: true })
            .select('_id')
            .cursor()
            .eachAsync(function (team) {
            return __awaiter(this, void 0, void 0, function* () {
                yield func(team._id);
                processed++;
            });
        });
        return processed;
    });
}
//'(doc: Document<unknown, any, Team> & Team & Required<{ _id: ObjectId; }>) => any'
function deleteOrphans() {
    return __awaiter(this, void 0, void 0, function* () {
        // Orphans are:
        //  members without teams
        //  bounties without teams
        //  teams without members
        //  prizes without teams
        yield membership_1.MembershipObject.find({})
            .populate('team')
            .cursor()
            .eachAsync(function (member) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!member.team) {
                    yield membership_1.MembershipObject.findByIdAndDelete(member._id);
                }
            });
        });
        yield team_1.TeamBountyObject.find({})
            .populate('team')
            .cursor()
            .eachAsync(function (bounty) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!bounty.team) {
                    console.log('delete bounty:', bounty._id);
                    yield team_1.TeamBountyObject.findByIdAndDelete(bounty._id);
                }
            });
        });
        yield team_1.TeamObject.find({})
            .cursor()
            .eachAsync(function (team) {
            return __awaiter(this, void 0, void 0, function* () {
                var member_count = yield membership_1.MembershipObject.countDocuments({ team: team._id, active: true });
                if (member_count === 0) {
                    console.log('delete team:', team._id);
                    yield deleteTeam(team._id);
                }
            });
        });
        yield team_1.TeamPrizeObject.find({})
            .populate('team')
            .cursor()
            .eachAsync(function (prize) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!prize.team) {
                    yield team_1.TeamPrizeObject.findByIdAndDelete(prize._id);
                }
            });
        });
    });
}
function getDraftPrize(teamId) {
    return __awaiter(this, void 0, void 0, function* () {
        let prize = yield team_1.TeamPrizeObject.findOne({ team: teamId, draft: true });
        if (!prize) {
            prize = new team_1.TeamPrizeObject({ draft: true, active: false, team: teamId });
            yield prize.save();
        }
        return prize;
    });
}
function createPrize(teamid, name, url) {
    var u = undefined;
    if (url) {
        u = url.trim();
    }
    var prize = new team_1.TeamPrizeObject({
        team: teamid,
        name: name.trim(),
        active: true,
        url: u
    });
    return prize.save();
}
function availablePrizes(teamid) {
    return team_1.TeamPrizeObject.find({
        team: teamid,
        awardedto: undefined,
        active: true
    }).sort({
        name: 1
    });
}
function nextAvailablePrize(teamid) {
    return team_1.TeamPrizeObject.findOne({
        team: teamid,
        awardedto: undefined,
        active: true
    }).sort({
        name: 1
    });
}
function getPrize(prizeid) {
    return team_1.TeamPrizeObject.findOne({
        _id: prizeid,
        active: true
    });
}
function awardPrizeTo(prizeid, memberid) {
    return team_1.TeamPrizeObject.findByIdAndUpdate(prizeid, {
        $set: {
            awardedto: memberid,
            awardedon: new Date()
        }
    }, {
        new: true
    });
}
function deactivePrize(prizeid) {
    return team_1.TeamPrizeObject.findByIdAndUpdate(prizeid, {
        $set: {
            active: false
        }
    }, {
        new: true
    });
}
function getTeams(active) {
    return __awaiter(this, void 0, void 0, function* () {
        let limit = 20;
        let query = {};
        if (active !== null) {
            query = { active: active };
        }
        return team_1.TeamObject.find(query).limit(limit).sort({ name: 1 });
    });
}
function getMemberById(memberId) {
    return __awaiter(this, void 0, void 0, function* () {
        return membership_1.MembershipObject.findById(memberId);
    });
}
module.exports = {
    activateBounty,
    addDefaultOwner,
    addMember,
    addMemberByContact,
    adjustSentCount,
    availablePrizes,
    awardPrizeTo,
    createBounty,
    createPrize,
    createTeam,
    createTeamName,
    deactivateBounty,
    deactivateMember,
    deactivePrize,
    deleteOrphans,
    deleteTeam,
    findMemberByContact,
    forEach,
    getBounties,
    getBounty,
    getMember,
    getMemberById,
    getMemberByEmail,
    getMemberByUserId,
    getMemberships,
    getNewMembers,
    getOwners,
    getDraftPrize,
    getPrize,
    getTeam,
    getTeams,
    getUsersMemberships,
    importMembers,
    incrementIdeaCount,
    incrementReceivedCount,
    incrementSentCount,
    nextAvailablePrize,
    notifyMember,
    notifyOwners,
    notifyTeam,
    resetMember,
    setMemberPrivileges,
    updateBounty,
    updateMember,
    updateMemberCount,
    updateTeam,
    updateUsersMemberships
};
