import { ConnectContactLens } from "aws-sdk";
import { AnyARecord } from "dns";
import { ObjectId } from "mongoose";
import { Membership, MembershipObject, TeamMember, UsersMembership } from "../models/membership";
import { Team, TeamObject, TeamBountyObject, TeamPrizeObject } from "../models/team";
import { User } from "../models/user";
import { smsSend } from "./sms";
import { smtpSend } from "./smtp";
import { findUserByContact } from "./users";
import { sanitizeEmail, sanitizeName, sanitizePhone } from "./utils";

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY,{
    apiVersion: process.env.STRIPE_API_VERSION
});
const cryptoRandomString = require('crypto-random-string');
const {phone} = require('phone');

const maxteams = 50;

function getDateDaysAgo(daysago:number) {
	var created = new Date();
	created.setDate(created.getDate() - daysago);
	let month = created.getMonth();
	let year = created.getFullYear();
	let day = created.getDate();
	created = new Date(Date.UTC(year, month, day, 12, 0, 0));
	return created;
}


function standardizePhone(number:string) {
	var p = phone(number);
	var standardized_phone = p[0];
	if (standardized_phone) {
		return standardized_phone;
	} else {
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



export async function addMemberByContact(teamid:ObjectId, owner:Membership, name:string, contact:string) {

	var n = sanitizeName(name);
	var e = sanitizeEmail(contact);
	var p = sanitizePhone(contact);

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
		teamMember = await MembershipObject.findOne({
			team: teamid,
			email: e
		});
	} else if (p) {
		teamMember = await MembershipObject.findOne({
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
		teamMember = new MembershipObject({
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
		var user = await findUserByContact(e,'email');
		if (user) {
			teamMember.user = user._id;
		}
	}

	await teamMember.save();

	await sendInvitation(teamMember, owner);
	await updateMemberCount(teamid);
	return teamMember;
}



// This is when we already have access to the user object, and not just the email
async function addMember(teamid:ObjectId, user:User) {
	var newteamMember = undefined;

	// See if the user already exists
	var teamMember = await MembershipObject.findOne({
		team: teamid,
		user: user._id
	});


	let phone = null;
	let email = null; 
	if (user.contacts.length) {
		if (user.contacts[0].contactType == 'phone') {
			phone = user.contacts[0].contact
		} 
		if (user.contacts[0].contactType == 'email') {
			email = user.contacts[0].contact
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
		teamMember = new MembershipObject({
			team: teamid,
			user: user._id,
			name: user.name,
			email: email,
			phone: phone,
			active: true
		});
	}
	await teamMember.save();

	await updateMemberCount(teamid);
	return teamMember;
}


export function getUsersMemberships(userid:ObjectId):UsersMembership[] {
	return MembershipObject.find({
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

export async function createTeamName(user:User) {
	var usersteams = await getUsersMemberships(user._id);

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
export async function createTeam(user:User,options:any={}):Promise<[Team,Membership]> {

	if (!options.teamName) {
		options.teamName = await createTeamName(user);
	}

	// Create a team
	let team = new TeamObject({
		name: options.teamName,
		members: 1
	});

	/*
	if (process.env.THANKS_BACKDATE_DAYS) {
	  let daysAgo = Number(process.env.THANKS_BACKDATE_DAYS);
	  team.created = getDateDaysAgo(daysAgo);
	}*/

	let membership = new MembershipObject({
		team: team._id,
		user: user._id,
		name: user.name,
		owner: true,
		active: true
	});

	return Promise.all([team.save(),membership.save()])
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
function getNewMembers(teamid:ObjectId):Membership[] {
	return MembershipObject.find({
			team: teamid,
			active: true
		})
		.sort({
			_id: -1
		})
		.limit(5);
}

function getMember(memberid:ObjectId):TeamMember {
	return MembershipObject.findOne({
		_id: memberid,
		active: true
	}).populate('user');
}

export function getMemberByUserId(teamid:ObjectId,userid:ObjectId):Membership {
	return MembershipObject.findOne({
		team: teamid,
		user: userid,
		active: true
	});
}


export function getMemberships(teamid:ObjectId):Promise<Membership[]> {
	return MembershipObject.find({
			team: teamid,
			active: true
		})
		.sort({
			name: 1,
			email: 1
		});
}


function getMemberByEmail(teamid:ObjectId, email:string):Membership {
	var standardized_email = sanitizeEmail(email);
	return MembershipObject.findOne({
		team: teamid,
		email: standardized_email,
		active: true
	});
}

function findMemberByContact(teamid:ObjectId, contact:string):Membership|null {
	var email = sanitizeEmail(contact);
	//var phone = teams.standardizePhone(contact);
	if (email) {
		return MembershipObject.findOne({
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

function adjustSentCount(teamid:ObjectId, count:number) {
	return TeamObject.findByIdAndUpdate(teamid, {
		$inc: {
			sent: count
		}
	}, {
		new: true
	});
};

function updateMemberCount(teamid:ObjectId) {
	return MembershipObject.countDocuments({
			team: teamid,
			active: true
		})
		.then( (member_count:number)  => {
			return TeamObject.findByIdAndUpdate(teamid, {
				$set: {
					members: member_count 
				}
			}, {
				new: true
			})
		});
}


async function deactivateMember(memberId:ObjectId) {
	var member = await MembershipObject.findOneAndUpdate(
		{
			_id: memberId,
			owner: false
		},
		{
			$set: {
				active: false
			}
		}, {
		new: true
		});
	if (!member) {
		return null;
	}
	await updateMemberCount(member.team);
	return member;
};

async function notifyMember(memberId:ObjectId, subject:string, body:string) {
	var teamMember = await getMember(memberId);
	for (let i = 0; i < teamMember.contacts.length; i++) {
		let contact = teamMember.contacts[i]
		if (contact.contactType == 'phone') {
			await smsSend(contact.contact, body);
		}
		if (contact.contactType == 'email') {
			await smtpSend(contact.contact, subject, body);
		}
	}
}

//
// Find any memberships that have the same contacts as this
// user and then associate the user with them.
async function updateUsersMemberships(user:User) {
	for (let i = 0; i < user.contacts.length;i++) {
		let contact = user.contacts[i]

		let members = await MembershipObject.find({
			"contact.contact": contact,
			active: true
		});
		for (let m = 0; m < members.length;m++) {
			let member = members[m];
			member.user = user._id;
			await member.save();
		}
	}
};

async  function addDefaultOwner(teamId:ObjectId) {
	let members = await getMemberships(teamId);
	return MembershipObject.findByIdAndUpdate(members[0]._id,{owner: true})
}


function sendInvitation(teamMember:ObjectId, owner:Membership) {
	if (!owner.contacts.length) {
		return;
	}
	var subject = "Invitation to Join th8nks";
	var body = "This is an automated message from Breadstand's Thanks Program.";
	body += `${owner.name} (${owner.contacts[0].contact}) would like you to join the thanks program.`;
	body += " To get started, visit: \n";
	body += 'https://www.th8nks.com/thanks/?memberid='+teamMember;
	body += "\n";
	body += "Thank you. We hope you have a great day.";
	return notifyMember(teamMember, subject, body);
}

export async function notifyTeam(teamid:ObjectId, subject:string, body:string) {
	await getMemberships(teamid)
		.then( (members:Membership[]) => {
			members.forEach(async member => {
				await notifyMember(member._id, subject, body);
			});
		});
}

async function notifyOwners(teamid:ObjectId, subject:string, body:string) {
	await getOwners(teamid)
		.then( members  => {
			members.forEach(async member => {
				await notifyMember(member._id, subject, body);
			});
		});
}


function getTeam(teamid:ObjectId) {
	return TeamObject.findById(teamid);
}


function getOwners(teamid:ObjectId):Promise<Membership[]> {
	return MembershipObject.find({
		team: teamid,
		owner: true,
		active: true
	});
}


function getStripeCustomerId(team:Team) {
	return new Promise((resolve, reject) => {
		if (team.stripeCustomerId) {
			return resolve(team.stripeCustomerId);
		}

		var description = `${team.name} ${team._id.toString()}`;
		return stripe.customers.create({
				description: description
			})
			.then( (result:any) => {
				team.stripeCustomerId = result.id;
				return TeamObject.findByIdAndUpdate(team._id,{stripeCustomerId: result.id})
			}).then( (team:Team) => {
				return resolve(team.stripeCustomerId);
			}).catch( (err:any) => {
				reject(err);
			});
	});
};





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



async function importMembers(teamid:ObjectId, owner:Membership, text:string) {
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
		let name = lineitem.slice(0,lastspace).trim();
		let contact = lineitem.slice(lastspace).trim();

		var m = await addMemberByContact(teamid, owner, name, contact);
		if (m) {
			imported.push(name);
		} else {
			rejected.push(list[i]);
		}
	};
	return [imported, rejected];
}

function createBounty(teamid:ObjectId, name:string, amount:number) {
	var bounty = new TeamBountyObject({
		team: teamid,
		name: sanitizeName(name),
		amount: amount
	});
	return bounty.save();
};

function getBounties(teamid:ObjectId,active:boolean|null=true) {
	var query = {
		team: teamid,
		active: active
	};
	return TeamBountyObject.find(query)
		.sort({
			name: 1
		});
}

export function getBounty(bountyid:ObjectId) {
	return TeamBountyObject.findById(bountyid);
}


function activateBounty(bountyid:ObjectId) {
	return TeamBountyObject.findByIdAndUpdate(bountyid, {
		$set: {
			active: true
		}
	}, {
		new: true
	});
}

function deactivateBounty(bountyid:ObjectId) {
	return TeamBountyObject.findByIdAndUpdate(bountyid, {
		$set: {
			active: false
		}
	}, {
		new: true
	});
}

async function updateBounty(bountyid:ObjectId,update:any) {
	if (update.name) {
		update.name = sanitizeName(update.name);
	}
	if (update.active !== undefined) {
		throw "Active status can only be updated through deactivateBounty()";
	}
	
	var bounty = await TeamBountyObject.findByIdAndUpdate(bountyid,{
		$set: update
	},{new: true});
	return bounty;
}

export function incrementSentCount(memberid:ObjectId,count=1) {
	return MembershipObject.findByIdAndUpdate(memberid, {
		$inc: {
			sent: count
		}
	}, {
		new: true
	});
}

export function incrementReceivedCount(memberid:ObjectId,count=1) {
	return MembershipObject.findByIdAndUpdate(memberid, {
		$inc: {
			received: count
		}
	}, {
		new: true
	});
}

export function incrementIdeaCount(memberid:ObjectId,count=1) {
	return MembershipObject.findByIdAndUpdate(memberid, {
		$inc: {
			ideas: count
		}
	}, {
		new: true
	});
}

function updateTeam(teamid:ObjectId, update:Team) {
	if (update.name) {
		update.name = update.name.slice(0,40).trim();
	}


	return TeamObject.findByIdAndUpdate(teamid, {
		$set: update
	}, {
		new: true
	});
}

async function resetMember(member:Membership) {
	await MembershipObject.findById(member._id,{user: null})
}

export function updateMember(memberid:ObjectId, update:Membership) {
	//Update to allow removal of email or phone
	let name = sanitizeName(update.name);
	if (name)  {
		update.name = name;
	}

	update.details = update.details.slice(0,80).trim();
	update.contacts.forEach( contact => {
		if (contact.contactType == 'email') {
			let sanitized = sanitizeEmail(contact.contact);
			if (sanitized) {
				contact.contact = sanitized
			}
		}
		if (contact.contactType == 'phone') {
			contact.contact = sanitizePhone(contact.contact);
		}
	})

	return MembershipObject.findByIdAndUpdate(memberid,update);
}

function setMemberPrivileges(memberid:ObjectId,privileges:string[]) {
	var update = {
		owner: false
	};
	if (privileges[0] == 'owner') {
		update.owner = true;
	}
	return MembershipObject.findByIdAndUpdate(memberid,{active: true,owner: true},{new: true})
}


async function deleteTeam(teamid:ObjectId) {
	var team = await TeamObject.findById(teamid);
	if (!team) {
		return null;
	}
	var jobs = [];

	jobs.push(TeamObject.findByIdAndDelete(teamid));
	jobs.push(MembershipObject.deleteMany({team: teamid}));
	jobs.push(TeamBountyObject.deleteMany({team: teamid}));	
	jobs.push(TeamPrizeObject.deleteMany({team: teamid}));

	await Promise.all(jobs);
}




async function forEach( func: (teamid:ObjectId)=>AnyARecord ) {
	var processed = 0;
	await TeamObject.find({active: true})
	.select('_id')
	.cursor()
	.eachAsync( async function (team: Team) {
		await func(team._id);
		processed++;
		});
	return processed;
}
//'(doc: Document<unknown, any, Team> & Team & Required<{ _id: ObjectId; }>) => any'


async function deleteOrphans() {
	// Orphans are:
	//  members without teams
	//  bounties without teams
	//  teams without members
	//  prizes without teams
	await MembershipObject.find({})
		.populate('team')
		.cursor()
		.eachAsync(async function(member:Membership) {
			if (!member.team) {
				await MembershipObject.findByIdAndDelete(member._id);
			}
		});

	await TeamBountyObject.find({})
		.populate('team')
		.cursor()
		.eachAsync(async function(bounty:any) {
			if (!bounty.team) {
				console.log('delete bounty:',bounty._id);
				await TeamBountyObject.findByIdAndDelete(bounty._id);
			}
		});

	await TeamObject.find({})
		.cursor()
		.eachAsync(async function(team:Team) {
			var member_count = await MembershipObject.countDocuments({team: team._id,active: true});
			if (member_count === 0) {
				console.log('delete team:',team._id);
				await deleteTeam(team._id);
			}
		});
	await TeamPrizeObject.find({})
	.populate('team')
	.cursor()
	.eachAsync(async function(prize:any) {
		if (!prize.team) {
			await TeamPrizeObject.findByIdAndDelete(prize._id);
		}
	});

}

async function getDraftPrize(teamId:ObjectId) {
	let prize = await TeamPrizeObject.findOne({team: teamId,draft: true});
	if (!prize) {
		prize = new TeamPrizeObject({draft: true, active: false,team: teamId});
		await prize.save();
	}
	return prize;
}


function createPrize(teamid:ObjectId, name:string, url:string) {
	var u = undefined;
	if (url) {
		u = url.trim();
	}
	var prize = new TeamPrizeObject({
		team: teamid,
		name: name.trim(),
		active: true,
		url: u
	});
	return prize.save();
}

function availablePrizes(teamid:ObjectId) {
	return TeamPrizeObject.find({
		team: teamid,
		awardedto: undefined,
		active: true
	}).sort({
		name: 1
	});
}

function nextAvailablePrize(teamid:ObjectId) {
	return TeamPrizeObject.findOne({
		team: teamid,
		awardedto: undefined,
		active: true
	}).sort({
		name: 1
	});
}


function getPrize(prizeid:ObjectId) {
	return TeamPrizeObject.findOne({
		_id: prizeid,
		active: true
	});
}

function awardPrizeTo(prizeid:ObjectId, memberid:ObjectId) {
	return TeamPrizeObject.findByIdAndUpdate(prizeid, {
		$set: {
			awardedto: memberid,
			awardedon: new Date()
		}
	}, {
		new: true
	});
}

function deactivePrize(prizeid:ObjectId) {
	return TeamPrizeObject.findByIdAndUpdate(prizeid, {
		$set: {
			active: false
		}
	}, {
		new: true
	});
}

async function getTeams(active:boolean|null) {
	let limit = 20;
	let query = {}
	if (active !== null) {
		query = {active: active}		
	}

	return TeamObject.find(query).limit(limit).sort({name: 1});
}


export async function getMemberById(memberId:ObjectId) {
	return MembershipObject.findById(memberId);
}


