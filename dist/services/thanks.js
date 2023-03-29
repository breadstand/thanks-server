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
exports.deactivatePost = exports.pickTeamWinners = exports.removeBounty = exports.approveBounty = exports.getThanksPosts = exports.createThanksPost = void 0;
const team_1 = require("../models/team");
const thankspost_1 = require("../models/thankspost");
const teams_1 = require("./teams");
function sanitizeFor(postfor, size = 280) {
    if (!postfor) {
        return '';
    }
    return postfor.slice(0, 280).trim();
}
function createThanksPost(newPost) {
    var thankspost = new thankspost_1.ThanksPostObject(newPost);
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
            (0, teams_1.incrementIdeaCount)(thankspost.createdBy);
        }
    }).then(results => {
        return thankspost;
    });
}
exports.createThanksPost = createThanksPost;
;
function sendToTeam(thanksid) {
    console.log('sendToTeam()');
    return thankspost_1.ThanksPostObject.findById(thanksid)
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
        var subject = `Thanks to ${thankspost.thanksTo.name}`;
        var body = `Thanks to ${thankspost.thanksTo.name}\n for ${thankspost.thanksFor}\n\n-- ${thankspost.createdBy.name}`;
        return (0, teams_1.notifyTeam)(thankspost.team._id, subject, body);
    }).catch(err => {
        console.log(err);
    });
}
function getThanksPosts(teamid, filter) {
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
    return thankspost_1.ThanksPostObject.find(query)
        .sort({
        _id: -1
    })
        .limit(count)
        .populate('thanksTo')
        .populate('prize')
        .populate('createdBy');
}
exports.getThanksPosts = getThanksPosts;
function approveBounty(postid, bountyid) {
    return __awaiter(this, void 0, void 0, function* () {
        let post = yield thankspost_1.ThanksPostObject.findByIdAndUpdate({
            _id: postid,
            postType: 'idea'
        }, {
            $push: {
                approvedBounties: bountyid
            }
        }, {
            new: true
        });
        if (!post) {
            return null;
        }
        let bounty = yield team_1.TeamBountyObject.findByIdAndUpdate({
            _id: bountyid
        }, {
            $push: {
                approvedIdeas: postid
            }
        }, {
            new: true
        });
        if (!bounty) {
            return post;
        }
        let subject = 'Bounty Approved: ' + post.idea;
        let message = 'Your idea was approved for a bounty.\n' +
            'Idea: ' + post.idea +
            'Bounty: ' + bounty.name +
            'Amount: ' + bounty.amount;
        if (!post.createdBy) {
            return post;
        }
        (0, teams_1.notifyMember)(post.createdBy, subject, message);
        return post;
    });
}
exports.approveBounty = approveBounty;
;
function removeBounty(postid, bountyid) {
    return __awaiter(this, void 0, void 0, function* () {
        let post = yield thankspost_1.ThanksPostObject.findById(postid);
        if (post) {
            let el = post.approvedBounties.findIndex(el => el.toString() == bountyid.toString());
            if (el >= 0) {
                post.approvedBounties.splice(el, 1);
            }
            yield post.save();
        }
        let bounty = yield team_1.TeamBountyObject.findById(bountyid);
        if (bounty) {
            let el = bounty.approvedIdeas.findIndex(el => el.toString() == postid.toString());
            if (el >= 0) {
                bounty.approvedIdeas.splice(el, 1);
            }
            yield bounty.save();
        }
        return post;
    });
}
exports.removeBounty = removeBounty;
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
        let mostRecentSet = yield thankspost_1.ThanksSetObject.find({
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
function getMostRecentSet(teamid) {
    return __awaiter(this, void 0, void 0, function* () {
        var recentsets = yield thankspost_1.ThanksSetObject.find({
            team: teamid
        }).sort({
            _id: -1
        }).limit(1);
        return recentsets[0];
    });
}
function notifyTeamOfWinners(teamid) {
    return __awaiter(this, void 0, void 0, function* () {
        var lastset = yield getMostRecentSet(teamid);
        if (!lastset) {
            console.log("Warning: getMostRecentSet() returned null");
            return;
        }
        var winners = yield getWinners(lastset._id);
        for (var i = 0; i < winners.length; i++) {
            var message = "We just picked a th8nks winner! ";
            let createdBy = winners[i].createdBy;
            if (!createdBy) {
                continue;
            }
            let thanksTo = winners[i].thanksTo;
            message += `${thanksTo.name} for ${winners[i].thanksFor} [from: ${createdBy.name}]`;
            let prize = winners[i].prize;
            if (prize === null || prize === void 0 ? void 0 : prize.name) {
                message += " Prize: " + prize.name;
            }
            yield (0, teams_1.notifyTeam)(teamid, "Thanks Winner Picked", message);
        }
    });
}
function createSet(teamid, start, end) {
    return __awaiter(this, void 0, void 0, function* () {
        var set = new thankspost_1.ThanksSetObject({
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
function makePostAWinner(postid, setid) {
    return __awaiter(this, void 0, void 0, function* () {
        var thankspost = yield thankspost_1.ThanksPostObject.findById(postid);
        if (!thankspost) {
            return;
        }
        var prize = yield (0, teams_1.nextAvailablePrize)(thankspost.team);
        if (!prize) {
            return;
        }
        yield (0, teams_1.awardPrizeTo)(prize._id, thankspost.thanksTo);
        thankspost.winner = true;
        thankspost.thanksSet = setid;
        thankspost.prize = prize._id;
        yield thankspost.save();
    });
}
function pickTeamWinners(teamid, numberOfMonths = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        let prizecount = 0;
        let team = yield (0, teams_1.getTeam)(teamid);
        if (!team) {
            throw "Team not found: " + teamid;
            return null;
        }
        // Step 1: Figure out if winners should be picked.
        // Basically, we pick once a month and if a month hasn't passed
        // we shouldn't pick any winners.
        // Figure out which month/date rane to pick winners for
        var daterange = yield figureOutDateRange(team);
        if (!daterange || daterange.monthsCovered < numberOfMonths) {
            return null;
        }
        // Step 2: Figure out what prizes are available.
        // The number of prizes tells us how many winners to pick.
        let prizes = yield (0, teams_1.availablePrizes)(teamid);
        prizecount = prizes.length;
        if (!prizecount) {
            (0, teams_1.notifyOwners)(teamid, "No Prizes Selected", "Dear admin for the Thanks team '" + team.name + "', You have not added any prizes. Please add some. " +
                "To fix this, login to https://www.breadstand.com/thanks and go to Teams -> Settings and enter in some prizes.");
            return null;
            //throw "No prizes for team '" + team.name + "'. Cannot pick a winner.";
        }
        // Step 3: Create a new set
        var set = yield createSet(teamid, daterange.start, daterange.end);
        // Step 4: Find thanksposts within that daterange
        var winningThanks = yield thankspost_1.ThanksPostObject.aggregate([{
                $match: {
                    team: teamid,
                    created: {
                        $gte: set.startDate,
                        $lt: set.endDate
                    },
                    active: true,
                    postType: 'thanks'
                }
            }]).sample(prizecount);
        // Step 5: Award prizes to those winners
        for (var i = 0; i < winningThanks.length; i++) {
            yield makePostAWinner(winningThanks[i]._id, set._id);
        }
        notifyTeamOfWinners(teamid);
        return set;
    });
}
exports.pickTeamWinners = pickTeamWinners;
function getWinners(setid) {
    return __awaiter(this, void 0, void 0, function* () {
        return thankspost_1.ThanksPostObject.find({
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
/*


async function pickWinners() {
    var processed = 0;
    await teams.forEach(async function (team, i) {
            await pickTeamWinners(team._id).catch(err => {
                console.log(err);
            });
            processed++;
        });
    return processed;
}


async function getTrendingByTeam(teamid) {
    var results = [];

    var posts = await ThanksPost.find({
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
/*
//
// The purpose here is to find any members who have sent a thanks in
// 'days' days. The return will be a list just like getWinners()
//
async function getUnappreciativeMembers(teamid) {
    // The way we will figure this out is to first, get all members of the team.
    // Second we will get all thanks posted less than team.nudge_days
    // For each thank we find, we will remove that user from the list
    var team = await teams.getTeam(teamid);
    var team_age_in_days = Math.floor((new Date() - team.created) / 1000 / 60 / 60 / 24);
    if (team_age_in_days < team.nudge_days) {
        return [];
    };


    // All members are unappreciative unless proven otherwise
    var unappreciativemembers = await teams.getMembers(teamid);
    // Go through all posts in the last nudge_days
    var since = new Date();
    since.setDate(since.getDate() - team.nudge_days);

    var appreciativemembers = await ThanksPost.aggregate([{
            $match: {
                team: teamid,
                created: {
                    $gte: since
                },
                active: true,
                $or: [{
                        posttype: 'thanks'
                    },
                    {
                        posttype: undefined
                    }
                ]
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
};
*/
/*
let default_nudge_subject = "It's been a while since you thanked anyone.";
let default_nudge_message = "This is the Thanks program. We noticed that you have not thanked anyone in a little while. Do you appreciate other people? Let them know. %loginurl%";

async function nudgeTeam(teamid) {
    var team = await teams.getTeam(teamid);
    if (!team.nudge_enabled) {
        return [];
    }
    var unappreciativemembers = await getUnappreciativeMembers(teamid);


    let now = new Date();
    let teamAgeInDays = Math.floor((now - team.created) / 1000 / 60 / 60 / 24);
    if (teamAgeInDays < team.nudge_days) {
        return [];
    }

    if (team.lastnudge) {
        let lastnudgedays = Math.floor((now - team.lastnudge) / 1000 / 60 / 60 / 24);
        if (lastnudgedays < team.nudge_again_days) {
            return [];
        }
    }

    var message = team.nudge_message;
    if (!message) {
        message = default_nudge_message;
    }
    var subject = team.nudge_subject;
    if (!subject) {
        subject = default_nudge_subject;
    }

    await teams.updateTeam(teamid, {
        lastnudge: new Date()
    });

    unappreciativemembers.forEach(async unappreciativemember => {
        await teams.notifyMember(unappreciativemember, subject, message);
    });
    return unappreciativemembers;
};

async function nudgeAllTeams() {
    var processed = 0;
    await teams.forEach( async teamid => {
            await nudgeTeam(teamid);
            processed++;
        });
    return processed;
}

function getWins(tomemberid, limit = 20) {

    return ThanksPost.find({
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
    return ThanksPost.findOne({
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

    return ThanksPost.findOneAndUpdate({
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
        var post = yield thankspost_1.ThanksPostObject.findByIdAndUpdate(postid, {
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
        ThanksPost.deleteMany({team: teamid}),
        ThanksSet.deleteMany({team: teamid})
    ]);
}

async function deleteOrphans() {
    await ThanksPost.find({})
        .populate('team')
        .cursor()
        .eachAsync(async function(post) {
            if (!post.team) {
                await ThanksPost.findByIdAndDelete(post._id);
            }
        });
}
*/
