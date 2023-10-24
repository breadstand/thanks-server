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
exports.deactivatePost = exports.nudgeAllTeams = exports.pickWinners = exports.pickTeamWinners = exports.figureOutDateRange = exports.getPosts = exports.notifyBountyCreator = exports.createPost = void 0;
const membership_1 = require("../models/membership");
const team_1 = require("../models/team");
const post_1 = require("../models/post");
const teams_1 = require("./teams");
const utils_1 = require("./utils");
const bounty_1 = require("../models/bounty");
function sanitizeFor(postfor, size = 280) {
    if (!postfor) {
        return '';
    }
    return postfor.slice(0, 280).trim();
}
function createPost(newPost) {
    var thankspost = new post_1.PostObject(newPost);
    return thankspost.save()
        .then((thankspost) => {
        if (thankspost.postType == 'thanks') {
            sendToTeam(thankspost._id);
            return Promise.all([
                (0, teams_1.incrementSentCount)(thankspost.createdBy),
                (0, teams_1.incrementReceivedCount)(thankspost.thanksTo)
            ]);
        }
        else {
            notifyBountyCreator(thankspost._id);
            (0, teams_1.incrementIdeaCount)(thankspost.createdBy);
        }
    }).then(results => {
        return thankspost;
    });
}
exports.createPost = createPost;
;
function sendToTeam(thanksid) {
    return post_1.PostObject.findById(thanksid)
        .populate({
        path: "createdBy"
    })
        .populate({
        path: "thanksTo"
    })
        .then((thankspost) => {
        if (!thankspost || !thankspost.thanksTo || !thankspost.createdBy) {
            return;
        }
        if (thankspost.postType != 'thanks') {
            return;
        }
        var subject = `Thanks to ${thankspost.thanksTo.name}!`;
        var body = `${subject} ${thankspost.createdBy.name} thanked ${thankspost.thanksTo.name} for: ${thankspost.thanksFor} https://thanks.breadstand.us.`;
        return (0, teams_1.notifyTeam)(thankspost.team._id, subject, body);
    }).catch(err => {
        console.log(err);
    });
}
function notifyBountyCreator(thanksid) {
    return __awaiter(this, void 0, void 0, function* () {
        let post = yield post_1.PostObject.findById(thanksid);
        if (!post) {
            return;
        }
        let createdBy = yield membership_1.MembershipObject.findById(post === null || post === void 0 ? void 0 : post.createdBy);
        let bounty = yield bounty_1.BountyObject.findById(post === null || post === void 0 ? void 0 : post.bounty);
        if (!createdBy || !bounty) {
            return;
        }
        let subject = `New Idea For: ${bounty.name}!`;
        let body = `${createdBy.name} submitted an idea for: ${bounty.name}. ${post.idea} https://thanks.breadstand.us.`;
        return (0, teams_1.notifyMember)(bounty.createdBy, subject, body);
    });
}
exports.notifyBountyCreator = notifyBountyCreator;
function getPosts(teamid, filter) {
    var count = 20;
    var query = {
        team: teamid,
        active: true
    };
    if (filter) {
        if (filter.beforepost) {
            query._id = {
                $lt: filter.beforepost
            };
        }
        if (filter.posttype == 'idea' || filter.posttype == 'thanks') {
            query.posttype = filter.posttype;
        }
        if (filter.winner !== undefined) {
            query.winner = filter.winner;
        }
        if (filter.from) {
            query.from = filter.from;
        }
        if (filter.to) {
            query.to = filter.to;
        }
        if (filter.bounty) {
            query.approved_bounties = {
                $elemMatch: {
                    $eq: filter.bounty
                }
            };
        }
        if (filter.limit) {
            count = filter.limit;
        }
    }
    return post_1.PostObject.find(query)
        .sort({
        _id: -1
    })
        .limit(count)
        .populate('thanksTo')
        .populate('prize')
        .populate('createdBy');
}
exports.getPosts = getPosts;
function figureOutDateRange(team, now = new Date()) {
    return __awaiter(this, void 0, void 0, function* () {
        /*
            The goal of this is to figure out the date range to select a
            winning thanks from. Basically this is the dates of the set.
            1.  The start of the date range should be one second past the end
                of the last set. If there is no last set, then when the team was
                created.
            2.  The end of the set should be last day of the previous month.
            3   All times will be in UTC (members of teams might be all over
                it's just easier)
        */
        let daterange = {
            start: team.created,
            end: now,
            monthsCovered: 1
        };
        let mostRecentSet = yield post_1.ThanksSetObject.find({
            team: team._id
        }).limit(1).sort({
            _id: -1
        });
        if (mostRecentSet.length > 0) {
            let lastset = mostRecentSet[0];
            let lastsetenddate = lastset.endDate;
            daterange.start = new Date(Date.UTC(lastsetenddate.getUTCFullYear(), lastsetenddate.getUTCMonth(), lastsetenddate.getUTCDate() + 1, 0, 0, 0, 0));
        }
        // The end of the date range will always be the last of the previous month. 
        daterange.end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        // If the team is too new, the end date will be today.
        if (daterange.end < daterange.start) {
            daterange.end = now;
        }
        // Determine months covered (months have different numbers of days)
        // The end will also be the last day of the month. 
        // If the startdate is the 1st of a given month then it's considered a full month.
        // It it's not the 1st then that month is a partial.
        if (daterange.start.getUTCDate() == 1) {
            // In order to figure out the months convered we have to compare from the begining
            // of the range. For example if the start is Nov 1 and end is Nov 30 then 
            // then endmonth(11) - beggingofmonth(11) = 0 which means no months covered, even though
            // it's a full month. To fix this, we calculate the firstday of this month (which is the
            // day after the end date).
            var firstofmonth = now;
            firstofmonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
            daterange.monthsCovered = (firstofmonth.getUTCFullYear() * 12 + firstofmonth.getUTCMonth()) -
                (daterange.start.getUTCFullYear() * 12 + daterange.start.getUTCMonth());
        }
        else {
            // In this case it will be something like: Oct 12 - Nov 30. Which is one month covered.
            daterange.monthsCovered = (daterange.end.getUTCFullYear() * 12 + daterange.end.getUTCMonth()) -
                (daterange.start.getUTCFullYear() * 12 + daterange.start.getUTCMonth());
        }
        return daterange;
    });
}
exports.figureOutDateRange = figureOutDateRange;
function getMostRecentSet(teamid) {
    return __awaiter(this, void 0, void 0, function* () {
        var recentsets = yield post_1.ThanksSetObject.find({
            team: teamid
        }).sort({
            _id: -1
        }).limit(1);
        return recentsets[0];
    });
}
function notifyTeamOfWinners(results, teamid, dryRun = true) {
    return __awaiter(this, void 0, void 0, function* () {
        for (var i = 0; i < results.winningPostsWithPrizes.length; i++) {
            var message = "We just picked a Thanks winner! ";
            let createdBy = results.winningPostsWithPrizes[i].createdBy;
            if (!createdBy) {
                continue;
            }
            let thanksTo = results.winningPostsWithPrizes[i].thanksTo;
            let subject = "Thanks Winner Picked";
            message += `${thanksTo.name} for ${results.winningPostsWithPrizes[i].thanksFor} [from: ${createdBy.name}]`;
            let prizeId = results.winningPostsWithPrizes[i].prize;
            let prize = yield team_1.TeamPrizeObject.findById(prizeId);
            if (prize === null || prize === void 0 ? void 0 : prize.name) {
                message += " Prize: " + prize.name;
            }
            results.messages.push(subject);
            results.messages.push(message);
            if (!dryRun) {
                yield (0, teams_1.notifyTeam)(teamid, subject, message);
            }
        }
    });
}
function createSet(teamid, start, end) {
    return __awaiter(this, void 0, void 0, function* () {
        var set = new post_1.ThanksSetObject({
            team: teamid,
            startDate: start,
            endDate: end
        });
        yield set.save();
        return set;
    });
}
/*
function updateSet(setid,update) {
    return ThanksSet.findByIdAndUpdate(setid,{
        $set: update
    },{new: true});
}

function getSet(setid) {
    return ThanksSet.findById(setid);
}

function deleteSet(setid) {
    return ThanksSet.findByIdAndDelete(setid);
}
*/
function makePostAWinner(results, postid, dryRun = true) {
    return __awaiter(this, void 0, void 0, function* () {
        let thankspost = yield post_1.PostObject.findById(postid)
            .populate('createdBy')
            .populate('thanksTo');
        if (!thankspost) {
            return;
        }
        // Find next available prize
        let prize = results.prizes.find(p => !p.awardedTo);
        if (!prize) {
            return;
        }
        prize.awardedTo = thankspost._id;
        prize.awardedOn = new Date();
        thankspost.winner = true;
        thankspost.prize = prize._id;
        results.winningPostsWithPrizes.push(thankspost);
    });
}
function pickTeamWinners(teamid, numberOfMonths = 1, dryRun = true) {
    return __awaiter(this, void 0, void 0, function* () {
        let results = new post_1.PickWinnersResults();
        let team = yield (0, teams_1.getTeam)(teamid);
        if (!team) {
            throw "Team not found: " + teamid;
            return results;
        }
        // Step 1: Figure out if winners should be picked.
        // Basically, we pick once a month and if a month hasn't passed
        // we shouldn't pick any winners.
        // Figure out which month/date rane to pick winners for
        var daterange = yield figureOutDateRange(team);
        results.start = daterange.start;
        results.end = daterange.end;
        results.monthsCovered = daterange.monthsCovered;
        if (!daterange || daterange.monthsCovered < numberOfMonths) {
            results.messages.push(`Debug: No winners selected because it's been less than ${numberOfMonths} since the last winners selection.`);
            return results;
        }
        // Step 2: Figure out what prizes are available.
        // The number of prizes tells us how many winners to pick.
        results.prizes = yield (0, teams_1.availablePrizes)(teamid);
        let prizecount = results.prizes.length;
        if (!prizecount) {
            let subject = "No Prizes Selected";
            let body = "Dear admin for the Thanks team '" + team.name + "', You have not added any prizes. Please add some. " +
                "To fix this, login to https://thanks.breadstand.us and go to Teams -> Settings and enter in some prizes.";
            results.messages.push(subject);
            results.messages.push(body);
            if (!dryRun) {
                (0, teams_1.notifyOwners)(teamid, subject, body);
            }
            return results;
            //throw "No prizes for team '" + team.name + "'. Cannot pick a winner.";
        }
        // Step 4: Find thanksposts within that daterange
        results.winningPosts = yield post_1.PostObject.aggregate([{
                $match: {
                    team: teamid,
                    created: {
                        $gte: results.start,
                        $lt: results.end
                    },
                    active: true,
                    postType: 'thanks'
                }
            }]).sample(prizecount);
        // Step 5: Award prizes to those winners
        for (var i = 0; i < results.winningPosts.length; i++) {
            yield makePostAWinner(results, results.winningPosts[i]._id, dryRun);
        }
        notifyTeamOfWinners(results, teamid, dryRun);
        // Save Pick Winners Results
        if (!dryRun) {
            results.set = yield createSet(teamid, daterange.start, daterange.end);
            for (let i = 0; i < results.prizes.length; i++) {
                let prize = results.prizes[i];
                yield team_1.TeamPrizeObject.findByIdAndUpdate(prize._id, {
                    $set: {
                        awardedTo: prize.awardedTo,
                        awardedOn: prize.awardedOn
                    }
                });
            }
            for (let i = 0; i < results.winningPostsWithPrizes.length; i++) {
                let post = results.winningPostsWithPrizes[i];
                post.thanksSet = results.set._id;
                yield post_1.PostObject.findByIdAndUpdate(post._id, {
                    $set: {
                        winner: true,
                        thanksSet: post.thanksSet,
                        prize: post.prize
                    }
                });
            }
        }
        return results;
    });
}
exports.pickTeamWinners = pickTeamWinners;
function getWinners(setid) {
    return __awaiter(this, void 0, void 0, function* () {
        return post_1.PostObject.find({
            thanksSet: setid
        })
            .populate({
            path: 'thanksTo'
        })
            .populate({
            path: 'prize'
        })
            .populate({
            path: 'createdBy'
        })
            .sort({
            _id: -1
        });
    });
}
function pickWinners() {
    return __awaiter(this, void 0, void 0, function* () {
        var processed = 0;
        let teams = yield team_1.TeamObject.find({ active: 1 });
        yield teams.forEach(function (team, i) {
            return __awaiter(this, void 0, void 0, function* () {
                let results = yield pickTeamWinners(team._id, 1, false).catch(err => {
                    console.log(err);
                });
                processed++;
            });
        });
        return processed;
    });
}
exports.pickWinners = pickWinners;
/*

async function getTrendingByTeam(teamid) {
    var results = [];

    var posts = await Post.find({
            team: teamid,
            active: true
        })
        .select('for')
        .sort({
            _id: -1
        })
        .limit(50);

    // keywords is a list of objects:
    // {
    //   word: String,
    //   count: Number
    //  }
    var keywords = [];
    // Extract all the words from the posts and put them into
    // the keywords array
    posts.forEach(function (post) {
        // Find all the keywords in a post
        var for_words = keyword_extractor.extract(post.for, {
            language: "english",
            remove_digits: true,
            return_changed_case: true
        });

        // Add them to our keywords list
        for_words.forEach(function (word) {
            var keyword = keywords.find(keyword => keyword.word == word);
            // If the word was found
            if (keyword) {
                keyword.count++;
            }
            // If not, add it to the list.
            else {
                keyword = {
                    word: word,
                    count: 1
                }
                keywords.push(keyword);
            }
        });
    });

    // Sort the keywords by frequency
    keywords.sort(function (a, b) {
        return b.count - a.count;
    });

    var trending = [];
    var trending_words = 10;
    for (var i = 0; i < trending_words && i < keywords.length; i++) {
        trending.push(keywords[i].word);
    }
    await teams.updateTeam(teamid, {
        trending: trending
    });
    return trending;
}

async function getTrending() {
    var processed = 0;
    await teams.forEach(async function (team, i) {
            await getTrendingByTeam(team._id);
            processed++;
        });
    return processed;
};
*/
//
// The purpose here is to find any members who have sent a thanks in
// 'days' days. The return will be a list just like getWinners()
//
function getUnappreciativeMembers(teamid) {
    return __awaiter(this, void 0, void 0, function* () {
        // The way we will figure this out is to first, get all members of the team.
        // Second we will get all thanks posted less than team.nudge_days
        // For each thank we find, we will remove that user from the list
        var team = yield (0, teams_1.getTeam)(teamid);
        if (!(team === null || team === void 0 ? void 0 : team.created)) {
            return [];
        }
        let team_age_in_days = (0, utils_1.getDaysDifference)(new Date(), team.created);
        if (team_age_in_days < team.nudgeDays) {
            return [];
        }
        ;
        // All members are unappreciative unless proven otherwise
        var unappreciativemembers = yield (0, teams_1.getMemberships)(teamid);
        // Go through all posts in the last nudge_days
        var since = new Date();
        since.setDate(since.getDate() - team.nudgeDays);
        var appreciativemembers = yield post_1.PostObject.aggregate([{
                $match: {
                    team: teamid,
                    created: {
                        $gte: since
                    },
                    active: true,
                    postType: 'thanks'
                }
            },
            {
                $group: {
                    _id: "$from"
                }
            }
        ]);
        appreciativemembers.forEach(appreciativemember => {
            let foundmember = unappreciativemembers.findIndex(element => element._id.toString() == appreciativemember._id);
            unappreciativemembers.splice(foundmember, 1);
        });
        return unappreciativemembers;
    });
}
;
let default_nudge_subject = "Not Feeling Appreciative? ";
let default_nudge_message = "This is the Thanks program. We noticed that you have not thanked anyone in a little while. Do you appreciate other people? Let them know. https://thanks.breadstand.us.";
function nudgeTeam(teamid) {
    return __awaiter(this, void 0, void 0, function* () {
        var team = yield (0, teams_1.getTeam)(teamid);
        if (!(team === null || team === void 0 ? void 0 : team.nudgeEnabled)) {
            return [];
        }
        var unappreciativemembers = yield getUnappreciativeMembers(teamid);
        let teamAgeInDays = (0, utils_1.getDaysDifference)(new Date(), team.created);
        if (teamAgeInDays < team.nudgeDays) {
            return [];
        }
        if (team.lastNudge) {
            let lastnudgedays = (0, utils_1.getDaysDifference)(new Date(), team.lastNudge);
            if (lastnudgedays < team.nudgeAgainDays) {
                return [];
            }
        }
        /*
        var message = team.nudgeMessage;
        if (!message) {
            message = default_nudge_message;
        }*/
        let message = "This is the Thanks program. ";
        message += "We noticed that you have not thanked anyone in a little while. ";
        message += `You are part of the team: ${team.name}. `;
        message += "Do you appreciate other people? ";
        message += "Let them know. https://thanks.breadstand.us.";
        var subject = team.nudgeSubject;
        if (!subject) {
            subject = default_nudge_subject;
        }
        yield team_1.TeamObject.findByIdAndUpdate(teamid, {
            $set: {
                lastNudge: new Date()
            }
        }, {
            new: true
        });
        for (let i = 0; i < unappreciativemembers.length; i++) {
            yield (0, teams_1.notifyMember)(unappreciativemembers[i]._id, subject, message);
        }
        return unappreciativemembers;
    });
}
;
function nudgeAllTeams() {
    return __awaiter(this, void 0, void 0, function* () {
        var processed = 0;
        let teams = yield team_1.TeamObject.find({ active: 1 });
        yield teams.forEach(function (team, i) {
            return __awaiter(this, void 0, void 0, function* () {
                let results = yield nudgeTeam(team._id);
                processed++;
            });
        });
        return processed;
    });
}
exports.nudgeAllTeams = nudgeAllTeams;
/*
function getWins(tomemberid, limit = 20) {

    return Post.find({
            to: tomemberid,
            winner: true,
            active: true,
            $or: [{
                posttype: 'thanks'
            }, {
                posttype: undefined
            }]
        })
        .sort({
            _id: -1
        })
        .limit(20)
        .populate({
            path: 'from'
        })
        .populate({
            path: 'prize'
        })
        .populate({
            path: 'to'
        });
}


export async function getPost(postId:ObjectId) {
    return Post.findOne({
            _id: thanksid,
            active: true
        })
        .populate('to')
        .populate('from')
        .populate('approved_bounties');
}




function updatePost(postid, update) {
    if (update.for) {
        update.for = sanitizeFor(update.for)
    };
    if (update.active !== undefined) {
        throw "Use deactivatePost() to update active status";
    }

    return Post.findOneAndUpdate({
        _id: postid,
        active: true
    }, {
        $set: update
    }, {
        new: true
    });
}

*/
function deactivatePost(postid) {
    return __awaiter(this, void 0, void 0, function* () {
        var post = yield post_1.PostObject.findByIdAndUpdate(postid, {
            $set: {
                active: false
            }
        }, {
            new: true
        });
        if (!post) {
            return null;
        }
        if (post.postType = 'idea') {
            (0, teams_1.incrementIdeaCount)(post.createdBy, -1);
        }
        else {
            (0, teams_1.incrementReceivedCount)(post.thanksTo, -1);
            (0, teams_1.incrementSentCount)(post.createdBy, -1);
        }
        return post;
    });
}
exports.deactivatePost = deactivatePost;
/*
function deleteTeamData(teamid) {
    return Promise.all([
        Post.deleteMany({team: teamid}),
        ThanksSet.deleteMany({team: teamid})
    ]);
}

async function deleteOrphans() {
    await Post.find({})
        .populate('team')
        .cursor()
        .eachAsync(async function(post) {
            if (!post.team) {
                await Post.findByIdAndDelete(post._id);
            }
        });
}
*/
