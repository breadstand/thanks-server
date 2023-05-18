import { ObjectId } from "mongoose";
import { Membership } from "../models/membership";
import { Team, TeamPrize, TeamPrizeObject } from "../models/team";
import { Post, PostDetailed, ThanksSetObject, ThanksSet, PostObject, PickWinnersResults } from "../models/post";
import { availablePrizes, awardPrizeTo, getTeam, incrementIdeaCount, incrementReceivedCount, incrementSentCount, nextAvailablePrize, notifyMember, notifyOwners, notifyTeam } from "./teams";


export interface DateRange {
	start: Date,
	end: Date,
	monthsCovered: number
}

function sanitizeFor(postfor: string, size = 280) {
	if (!postfor) {
		return '';
	}
	return postfor.slice(0, 280).trim();
}

export function createPost(newPost: Post) {
	var thankspost = new PostObject(newPost);
	return thankspost.save()
		.then((thankspost: Post) => {
			if (thankspost.postType == 'thanks') {
				sendToTeam(thankspost._id);
				return Promise.all([
					incrementSentCount(thankspost.createdBy as ObjectId),
					incrementReceivedCount(thankspost.thanksTo as ObjectId)
				]);
			} else {
				incrementIdeaCount(thankspost.createdBy as ObjectId)
			}
		}).then(results => {
			return thankspost;
		});
};

function sendToTeam(thanksid: ObjectId) {
	console.log('sendToTeam()')
	return PostObject.findById(thanksid)
		.populate({
			path: "createdBy"
		})
		.populate({
			path: "thanksTo"
		})
		.then((thankspost: any) => {
			if (!thankspost || !thankspost.thanksTo || !thankspost.createdBy) {
				return;
			}
			if (thankspost.postType != 'thanks') {
				return;
			}
			var subject = `Thanks to ${thankspost.thanksTo.name}!`;
			var body = `${subject} ${thankspost.createdBy.name} thanked ${thankspost.thanksTo.name} for: ${thankspost.thanksFor} .https://thanks.breadstand.us.`;
			return notifyTeam(thankspost.team._id, subject, body);
		}).catch(err => {
			console.log(err);
		});
}



export function getPosts(teamid: ObjectId, filter: any) {

	var count = 20;

	var query: any = {
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
			}
		}
		if (filter.limit) {
			count = filter.limit
		}
	}
	return PostObject.find(query)
		.sort({
			_id: -1
		})
		.limit(count)
		.populate('thanksTo')
		.populate('prize')
		.populate('createdBy');
}





export async function figureOutDateRange(team: Team, now: Date = new Date()) {
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

	let daterange: DateRange = {
		start: team.created,
		end: now,
		monthsCovered: 1
	};


	let mostRecentSet: ThanksSet[] = await ThanksSetObject.find({
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
		daterange.end = now
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
	} else {
		// In this case it will be something like: Oct 12 - Nov 30. Which is one month covered.
		daterange.monthsCovered = (daterange.end.getUTCFullYear() * 12 + daterange.end.getUTCMonth()) -
			(daterange.start.getUTCFullYear() * 12 + daterange.start.getUTCMonth());
	}
	return daterange;
}

async function getMostRecentSet(teamid: ObjectId): Promise<ThanksSet | null> {
	var recentsets = await ThanksSetObject.find({
		team: teamid
	}).sort({
		_id: -1
	}).limit(1);
	return recentsets[0];
}

async function notifyTeamOfWinners(results:PickWinnersResults,teamid: ObjectId,dryRun = true) {

	for (var i = 0; i < results.winningPostsWithPrizes.length; i++) {
		var message = "We just picked a Thanks winner! ";

		let createdBy = results.winningPostsWithPrizes[i].createdBy as Membership;
		if (!createdBy) {
			continue;
		}
		let thanksTo = results.winningPostsWithPrizes[i].thanksTo as Membership;

		let subject = "Thanks Winner Picked"
		message += `${thanksTo.name} for ${results.winningPostsWithPrizes[i].thanksFor} [from: ${createdBy.name}]`;
		let prize = results.winningPostsWithPrizes[i].prize as TeamPrize
		if (prize?.name) {
			message += " Prize: " + prize.name;
		}
		results.messages.push(subject)
		results.messages.push(message)
		if (!dryRun) {
			await notifyTeam(teamid,subject, message);
		}
	}
}

async function createSet(teamid: ObjectId, start: Date, end: Date) {
	var set = new ThanksSetObject({
		team: teamid,
		startDate: start,
		endDate: end
	});
	await set.save();
	return set;
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
async function makePostAWinner(results: PickWinnersResults, postid: ObjectId,dryRun = true) {
	let thankspost = await PostObject.findById(postid)
		.populate('createdBy')
		.populate('thanksTo');
	if (!thankspost) {
		return
	}

	// Find next available prize
	let prize = results.prizes.find( p => !p.awardedTo)
	if (!prize) {
		return
	}

	prize.awardedTo = thankspost._id
	prize.awardedOn = new Date()
	thankspost.winner = true;
	thankspost.prize = prize._id;
	results.winningPostsWithPrizes.push(thankspost)
}


export async function pickTeamWinners(teamid: ObjectId, numberOfMonths = 1, dryRun = true): Promise<PickWinnersResults> {
	let results = new PickWinnersResults()
	let team = await getTeam(teamid);
	if (!team) {
		throw "Team not found: " + teamid
		return results
	}
	// Step 1: Figure out if winners should be picked.
	// Basically, we pick once a month and if a month hasn't passed
	// we shouldn't pick any winners.

	// Figure out which month/date rane to pick winners for
	var daterange = await figureOutDateRange(team);
	results.start = daterange.start
	results.end = daterange.end
	results.monthsCovered = daterange.monthsCovered
	if (!daterange || daterange.monthsCovered < numberOfMonths) {
		results.messages.push(`Debug: No winners selected because it's been less than ${numberOfMonths} since the last winners selection.`)
		return results
	}

	// Step 2: Figure out what prizes are available.
	// The number of prizes tells us how many winners to pick.
	results.prizes = await availablePrizes(teamid);
	let prizecount = results.prizes.length;
	if (!prizecount) {
		let subject = "No Prizes Selected"
		let body = "Dear admin for the Thanks team '" + team.name + "', You have not added any prizes. Please add some. " +
			"To fix this, login to https://www.breadstand.com/thanks and go to Teams -> Settings and enter in some prizes.";
		results.messages.push(subject)
		results.messages.push(body)

		if (!dryRun) {
			notifyOwners(teamid, subject,body);
		}
		return results;
		//throw "No prizes for team '" + team.name + "'. Cannot pick a winner.";
	}


	// Step 4: Find thanksposts within that daterange
	results.winningPosts = await PostObject.aggregate([{
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
		await makePostAWinner(results,results.winningPosts[i]._id,dryRun);
	}


	notifyTeamOfWinners(results,teamid,dryRun);

	// Save Pick Winners Results
	if (!dryRun) {
		results.set = await createSet(teamid, daterange.start, daterange.end);

		for(let i = 0; i < results.prizes.length;i++) {
			let prize = results.prizes[i]
			await TeamPrizeObject.findByIdAndUpdate(prize._id, {
				$set: {
					awardedTo: prize.awardedTo,
					awardedOn: prize.awardedOn
				}
			});		
		}

		for(let i = 0; i < results.winningPostsWithPrizes.length;i++) {
			let post = results.winningPostsWithPrizes[i]
			post.thanksSet = results.set._id
			await PostObject.findByIdAndUpdate(post._id,{
				$set: {
					winner: true,
					thanksSet: post.thanksSet,
					prize: post.prize
				}
			})
		}
	}

	return results
}


async function getWinners(setid: ObjectId): Promise<Post[]> {

	return PostObject.find({
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

	var appreciativemembers = await Post.aggregate([{
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

export async function deactivatePost(postid: ObjectId): Promise<Post | null> {
	var post = await PostObject.findByIdAndUpdate(postid, {
		$set: {
			active: false
		}
	}, {
		new: true
	}) as Post
	if (!post) {
		return null
	}

	if (post.postType = 'idea') {
		incrementIdeaCount(post.createdBy as ObjectId, -1);
	}
	else {
		incrementReceivedCount(post.thanksTo as ObjectId, -1);
		incrementSentCount(post.createdBy as ObjectId, -1);
	}
	return post;
}

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

