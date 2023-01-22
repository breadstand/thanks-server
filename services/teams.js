const Team = require('../models/team').Team;
const Membership = require('../models/membership').Membership;
const TeamBounty = require('../models/team').TeamBounty;
const TeamPrize = require('../models/team').TeamPrize;
const loadImageFromS3 = require('../models/image').loadImageFromS3;
const smtp = require('../services/smtp');
const sms = require('../services/sms');
const utils = require('../services/utils');
const users = require('../services/users');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY,{
    apiVersion: process.env.STRIPE_API_VERSION
});
const cryptoRandomString = require('crypto-random-string');

const maxteams = 50;

function getDateDaysAgo(daysago) {
	var created = new Date();
	created.setDate(created.getDate() - daysago);
	month = created.getMonth();
	year = created.getFullYear();
	day = created.getDate();
	created = new Date(Date.UTC(year, month, day, 12, 0, 0));
	return created;
}


function standardizePhone(phone) {
	var p = phoneParser(phone);
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



async function addMemberByContact(teamid, owner, name, contact) {
	if (!(owner instanceof Membership)) {
		throw new Error("First paramater of addMemberByContact() should be Membership object");  // generates an error object with the message of Required

	}

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

	// See if the user already exists
	if (e) {
		teamMember = await Membership.findOne({
			team: teamid,
			email: e
		});
	} else if (p) {
		teamMember = await Membership.findOne({
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
		teamMember = new Membership({
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
		var user = await users.findUserByEmail(e);
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
async function addMember(teamid, user) {
	var newteamMember = undefined;

	// See if the user already exists
	var teamMember = await Membership.findOne({
		team: teamid,
		user: user._id
	});

	var email;
	if (user.emails.length) {
		email = user.emails[0].email;
	}

	// If they do, make sure they are active.
	if (teamMember) {
		teamMember.active = true;
		teamMember.name = user.name;
		teamMember.email = email;
	}
	// If not, then add the member
	else {
		teamMember = new Membership({
			team: teamid,
			user: user._id,
			name: user.name,
			email: email,
			active: true
		});
	}
	await teamMember.save();

	await updateMemberCount(teamid);
	return teamMember;
}


function getUsersMemberships(userid) {
	if (!userid) {
		throw new Error('getUsersMembership missing parameter: userid');
	}

	return Membership.find({
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

async function createTeamName(user) {
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
async function createTeam(user,options={}) {

	if (!options.teamName) {
		options.teamName = await createTeamName(user);
	}
	if (!options.whiteRabbit) {
		options.whiteRabbit = false;
	}

	// Create a team
	var team = new Team({
		name: options.teamName,
		whiteRabbit: options.whiteRabbit,
		members: 1
	});

	/*
	if (process.env.THANKS_BACKDATE_DAYS) {
	  let daysAgo = Number(process.env.THANKS_BACKDATE_DAYS);
	  team.created = getDateDaysAgo(daysAgo);
	}*/

	var membership = new Membership({
		team: team._id,
		user: user._id,
		name: user.name,
		owner: true,
		active: true
	});

	return await Promise.all([team.save(), membership.save()]);
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
	return Membership.find({
			team: teamid,
			active: true
		})
		.sort({
			_id: -1
		})
		.limit(5);
}

function getMember(memberid) {
	return Membership.findOne({
		_id: memberid,
		active: true
	}).populate('user').select('-photo.ETag');
}

function getMemberByUserId(teamid,userid) {
	return Membership.findOne({
		team: teamid,
		user: userid,
		active: true
	});
}


function getMemberships(teamid) {
	return Membership.find({
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
	return Membership.findOne({
		team: teamid,
		email: standardized_email,
		active: true
	});
}

function findMemberByContact(teamid, contact) {
	var email = utils.sanitizeEmail(contact);
	//var phone = teams.standardizePhone(contact);
	if (email) {
		return Membership.findOne({
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
	return Team.findByIdAndUpdate(teamid, {
		$inc: {
			sent: count
		}
	}, {
		new: true
	});
};

function updateMemberCount(teamid) {
	return Membership.countDocuments({
			team: teamid,
			active: true
		})
		.then(member_count => {
			return Team.findByIdAndUpdate(teamid, {
				$set: {
					members: member_count
				}
			}, {
				new: true
			})
		});
}


async function deactivateMember(memberId) {
	var member = await Membership.findOneAndUpdate(
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

async function notifyMember(memberId, subject, body) {
	var teamMember = await getMember(memberId);
	if (teamMember.email) {
		await smtp.send(teamMember.email, subject, body);
	}
	if (teamMember.phone) {
		await sms.send(teamMember.phone, body);
	}
}

async function updateUsersMemberships(user) {
	if (!user.emails) {
		return null;
	}
	for (let i = 0; i < user.emails.length;i++) {
		let email = user.emails[i].email;

		let members = await Membership.find({
			email: email,
			active: true
		});
		for (let m = 0; m < members.length;m++) {
			let member = members[m];
			member.user = user._id;
			await member.save();
		}
	}
};

async  function addDefaultOwner(teamId) {
	let members = await getMemberships(teamId);
	members[0].owner = true;
	members[0].save();
	return members[0];
}


function sendInvitation(teamMember, owner) {
	var subject = "Invitation to Join th8nks";
	var body = "This is an automated message from Breadstand's Thanks Program.";
	body += `${owner.name} (${owner.email}) would like you to join the thanks program.`;
	body += " To get started, visit: \n";
	body += 'https://www.th8nks.com/thanks/?memberid='+teamMember._id;
	body += "\n";
	body += "Thank you. We hope you have a great day.";
	return notifyMember(teamMember, subject, body);
}

async function notifyTeam(teamid, subject, body) {
	await getMemberships(teamid)
		.then(members => {
			members.forEach(async member => {
				await notifyMember(member, subject, body);
			});
		});
}

async function notifyOwners(teamid, subject, body) {
	await getOwners(teamid)
		.then(members => {
			members.forEach(async member => {
				await notifyMember(member, subject, body);
			});
		});
}

async function searchForMembers(teamid, searchFor, maxCount = 5) {
	
	var members = await Membership.find({
		team: teamid,
		active: true,
		name: new RegExp(searchFor, 'i')
	}).select('name phone email').limit(maxCount).sort('name');
	var results = [];
	members.forEach(member => {
		var entry = {
			name: member.name
		};
		if (member.email) {
			entry.name += " " + member.email;
		}
		else if (member.phone) {
			entry.name += " " + member.phone;
		}
		results.push(entry);
	});
	return results;
}

function getTeam(teamid) {
	return Team.findById(teamid).select('-photo.ETag');
}

async function setTeamImage(teamid,image) {
    var team = await getTeam(teamid);
    if (!team) {
        return;
	}
	if (image) {
		if (image.data.length > 20000000) {
			throw 'Image size cannot exceed 20MB';        
		}	
		team.photo = {
			imageid: 'team_'+team._id.toString(),
			contentType: 'image/jpeg'
		};
		await images.saveImageBuffer(team.photo.imageid,image.data);	
	}
	else {
		if(team.photo && team.photo.imageid) {
			await images.deleteImageBuffer(team.photo.imageid);
		}
		team.photo = undefined;
	}
    await team.save();
}

async function getTeamImage(teamid,size) {
    var team = await getTeam(teamid);
	if (!team || !team.photo || !team.photo.imageid) {
		return null;
	}
	let imageBuffer = await images.getImageBuffer(team.photo.imageid,size);
	let image = {
		data: imageBuffer,
		contentType: team.photo.contentType
	};
	return image;
}

function getOwners(teamid) {
	return Membership.find({
		team: teamid,
		owner: true,
		active: true
	});
}


async function setMemberImage(memberid,image) {
	if (!image) {
		throw new Error('setMemberImage() missing required paramater: image');
	}
	
    var member = await getMember(memberid);
    if (!member) {
        return;
	}
	let thumbnailBuffer = await images.generateThumbnail(image.data,800,800);
	member.photo = { 
		imageid: "member_"+member._id.toString(),
		contentType: 'image/jpeg'
	};
	await images.saveImageBuffer(member.photo.imageid,thumbnailBuffer,{convertToJpeg: false,generateThumbnail: false});	
    await member.save();
}

async function getMemberImage(memberid) {
	var member = await Membership.findOne({
		_id: memberid,
		active: true
	});
	if (!member || !member.photo || !member.photo.imageid) {
		let user = await users.getUser(member.user);
		if (!user) {
			return null;
		}
		let image = await users.getUserImage(user);
		return image;
	}
	let imageBuffer = await images.getImageBuffer(member.photo.imageid);
	let image = {
		data: imageBuffer,
		contentType: member.photo.contentType
	}
	if (!image.contentType) {
		return null;
	}
	return image;
}

async function deleteMemberImage(memberid) {
	var member = await getMember(memberid);
    if (!member) {
        return;
	}
	if (member.photo && member.photo.imageid) {
		await images.deleteImageBuffer(member.photo.imageid);
	}
	member.photo = undefined;
	await member.save();
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
			.then(result => {
				team.stripeCustomerId = result.id;
				return team.save();
			}).then(team => {
				return resolve(team.stripeCustomerId);
			}).catch(err => {
				reject(err);
			});
	});
};



function updatePaymentMethod(teamid, stripeToken) {
	// All charges use the Stripe Customer
	// Therefore first, we need a stripe customer
	var source = undefined;

	return new Promise((resolve, reject) => {
		Team.findById(teamid).then(team => {
				return getStripeCustomerId(team);
			}).then(stripeCustomerId => {
				return stripe.customers.update(stripeCustomerId, {
					source: stripeToken
				});
			}).then(customer => {
				source = stripeutils.extractSource(customer);
				return collectUnpaidOrders(teamid);
			}).then(orders => {
				return resolve(source);
			})
			.catch(err => {
				reject(err);
			});
	});
}


function getSavedStripeSources(teamid) {
	return new Promise((resolve, reject) => {
		Team.findById(teamid).then(team => {
			if (team.stripeCustomerId) {
				return stripe.customers.retrieve(team.stripeCustomerId)
					.then(customer => {
						let source = stripeutils.extractSource(customer);
						return resolve(source);
					}).catch(err => {
						console.log(err);
						return reject(err);
					});
			}
			return resolve(null);
		}).catch(err => {
			return reject(err);
		});
	});
}


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

function shouldBill(team, billDate = new Date()) {
	/*
	    We will only bills teams that:
	    1. Were created on/before the 5th of the previous month
	    2. They were not already billed this month
	*/
	let createdMonth = team.created.getYear() * 12 + team.created.getMonth();
	let billMonth = billDate.getYear() * 12 + billDate.getMonth();

	// Was the team created this month? Then it's too new.
	if (billMonth - createdMonth <= 0) {
		return false;
	}

	// Was the team created in the last month?
	let createdDay = team.created.getDate();
	if (billMonth - createdMonth <= 1) {
		// Was it created after the 5th? Then it's too new.
		if (createdDay > 5) {
			return false;
		}
	}

	// At this point we know that the team is over 1 month old.

	// Was the team already bill for this month? 
	// If yes, then we can't bill them again.
	let lastbill = team.lastbill || team.created;
	let lastBillMonth = lastbill.getYear() * 12 + lastbill.getMonth();
	if (billMonth == lastBillMonth) {
		return false;
	}
	return true;
}

function createMonthlyBill(teamid) {
	var order = undefined;
	var team = undefined;
	var lastbill = undefined;
	return new Promise((resolve, reject) => {

		// 1. Load the team
		Team.findById(teamid)
			.then(_team => {
				team = _team;

				// 2. Check if the team needs to be billed
				if (!shouldBill(team)) {
					return null;
				}
				// 3. Determine the last billing date
				lastbill = team.lastbill || team.created;

				// 4. Count active members since the last billing date
				return getMemberships(team._id);
			}).then(members => {
				if (members == null) {
					return null;
				}
				var membersToBill = 0;
				for (var i = 0; i < members.length; i++) {
					if (members[i].created < lastbill && members[i].active != false) {
						membersToBill++;
					}
				}

				// 5. Create the order
				//    For the standard plan, the first 5 users are free
				//    Then 9.99 after that.
				var freeMembers = Math.min(5, membersToBill);
				var freeMemberPrice = 0;
				var billableMembers = Math.max(membersToBill - 5, 0);
				var billableMemberPrice = 999;
				order = new Order({
					team: team._id,
					items: [{
							quantity: freeMembers,
							sku: 'THANKS',
							description: 'Thanks: First 5 Members',
							amount: freeMemberPrice,
							taxcode: '30070'
						},
						{
							quantity: billableMembers,
							sku: 'THANKS',
							description: 'Thanks: Standard Members',
							amount: billableMemberPrice,
							taxcode: '30070'
						}
					],
					shipping: {
						cost: 0,
						carrier: 'USPS'
					},
					paymentmethod: {
						type: 'Stripe',
						customer: team.stripeCustomerId
					}
				});
				return order.save();
			}).then(created_order => {
				if (created_order == null) {
					return null;
				}
				order = created_order;
				team.lastbill = new Date();
				return team.save();
			}).then(team => {
				if (!team) {
					return resolve([null, null]);
				}
				return resolve(payOrder(order._id));
			}).catch(err => {
				return reject(err);
			});
	});
}


function createMonthlyBills() {

	return new Promise((resolve, reject) => {
		Team.find({
				active: true
			})
			.select('_id')
			.then(async function (teams) {
				for (var i = 0; i < teams.length; i++) {
					await createMonthlyBill(teams[i]._id);
				}
				return resolve(teams.length);
			}).catch(err => {
				return reject(err);
			});
	});
}



function checkForNonPayment() {
	let now = new Date();
	let oneday = 1000 * 60 * 60 * 24;
	let gracePeriod = Number(process.env.THQNKS_GRACE_PERIOD);
	let jobs = [];
	return new Promise((resolve, reject) => {
		Team.find({
				amountdue: {
					$exists: true,
					$gt: 0
				}
			})
			.then(teams => {
				for (var t = 0; t < teams.length; t++) {
					var team = teams[t];
					let days = Math.round((now - team.lastbill) / oneday);
					if (days > gracePeriod) {
						team.active = false;
						jobs.push(team.save());
					}
				}
				return resolve(Promise.all(jobs));
			}).catch(err => {
				return reject(err);
			});
	});
}


function payOrder(orderid) {

	var order = undefined;
	var team = undefined;
	return new Promise((resolve, reject) => {
		Order.findById(orderid).then(_order => {
			order = _order;
			return Team.findById(order.team);
		}).then(_team => {
			team = _team;
			// Empty orders do not need to be charged.
			if (order.total == 0) {
				return {};
			}

			// Create Stripe Orer and cahrge it.
			var chargeObject = {
				amount: order.total,
				customer: order.paymentmethod.customer,
				description: order.items[0].description,
				currency: 'usd',
				metadata: {
					"orderid": order._id.toString()
				}
			};
			return stripe.charges.create(chargeObject);
		}).then(result => {
			// If there is not an error, then Stripe payment succeeded.
			if (result == null) {
				return [null, null];
			}
			// Payment succeeded
			let jobs = [];
			order.paymentmethod.transactionid = result.id;
			order.paid = new Date();
			jobs.push(order.save());
			if (!team.active) {
				team.active = true;
				team.lastbill = new Date();
			}
			team.amountdue = 0;
			jobs.push(team.save());
			return resolve(Promise.all(jobs));
		}).catch(err => {
			// Something went wrong
			if (err.message && (err.type == 'StripeCardError' ||
					err.raw.type == 'invalid_request_error')) {
				// Paymen failed
				notifyOwners(team._id, "Payment Required",
					`We tried processing your thanks winenrs but we were unable to find a defined payment: ${err.message} `);
				team.amountdue = order.total;
				order.failed = err.message;
				return resolve(
					Promise.all([
						order.save(),
						team.save()
					]));
			} else {
				console.log(err);
			}
			return reject(err);
		});
	});
}

function getUnpaidOrders(teamid) {
	return Order.find({
		team: teamid,
		paid: {
			$exists: false
		},
		failed: {
			$exists: true
		}
	}).select('_id team');
}

function collectUnpaidOrders(teamid) {
	return new Promise((resolve, reject) => {
		getUnpaidOrders(teamid)
			.then(async function (orders) {
				for (var i = 0; i < orders.length; i++) {
					await payOrder(orders[i]._id);
				}
				return resolve(orders);
			}).catch(err => {
				return reject(err);
			});
	});
}


async function importMembers(teamid, owner, text) {
	var list = text.split("\n");
	var imported = [];
	var rejected = [];

	for (var i = 0; i < list.length; i++) {
		var name = undefined;
		var email = undefined;
		var phone = undefined;

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
		var name = lineitem.slice(0,lastspace).trim();
		var contact = lineitem.slice(lastspace).trim();

		var m = await addMemberByContact(teamid, owner, name, contact);
		if (m) {
			imported.push(name);
		} else {
			rejected.push(list[i]);
		}
	};
	return [imported, rejected];
}

function createBounty(teamid, name, amount) {
	var bounty = new TeamBounty({
		team: teamid,
		name: utils.sanitizeName(name),
		amount: amount
	});
	return bounty.save();
};

function getBounties(teamid,filter) {
	var query = {
		team: teamid,
		active: true
	};
	if (filter) {
		if (filter.active == false) {
			query.active = false;
		}	 
	}
	return TeamBounty.find(query)
		.sort({
			name: 1
		});
}

function getBounty(bountyid) {
	return TeamBounty.findById(bountyid);
}


function activateBounty(bountyid) {
	return TeamBounty.findByIdAndUpdate(bountyid, {
		$set: {
			active: true
		}
	}, {
		new: true
	});
}

function deactivateBounty(bountyid) {
	return TeamBounty.findByIdAndUpdate(bountyid, {
		$set: {
			active: false
		}
	}, {
		new: true
	});
}

async function updateBounty(bountyid,update) {
	if (update.name) {
		update.name = utils.sanitizeName(update.name);
	}
	if (update.active !== undefined) {
		throw "Active status can only be updated through deactivateBounty()";
	}
	
	var bounty = await TeamBounty.findByIdAndUpdate(bountyid,{
		$set: update
	},{new: true});
	return bounty;
}

function incrementSentCount(memberid,count=1) {
	return Membership.findByIdAndUpdate(memberid, {
		$inc: {
			sent: count
		}
	}, {
		new: true
	});
}

function incrementReceivedCount(memberid,count=1) {
	return Membership.findByIdAndUpdate(memberid, {
		$inc: {
			received: count
		}
	}, {
		new: true
	});
}

function incrementIdeaCount(memberid,count=1) {
	return Membership.findByIdAndUpdate(memberid, {
		$inc: {
			ideas: count
		}
	}, {
		new: true
	});
}

function updateTeam(teamid, update) {
	if (update.name) {
		update.name = update.name.slice(0,40).trim();
	}


	return Team.findByIdAndUpdate(teamid, {
		$set: update
	}, {
		new: true
	});
}

async function resetMember(member) {
	member.user = null;
	await member.save();
}

function updateMember(memberid, update) {
	//Update to allow removal of email or phone
	var member_update = {};
	var name = utils.sanitizeName(update.name);
	if (name)  {
		member_update.name = name;
	}

	member_update.details = update.details;
	if (update.details) {
		member_update.details = update.details.slice(0,80).trim();
	}
	var email = utils.sanitizeEmail(update.email);
	if (email)  {
		member_update.email = email;
	}
	var phone = utils.sanitizePhone(update.phone);
	if (phone) {
		member_update.phone = phone;			
	}
	// This makes sure that they have email or phone while also allowing one to be removed.
	if (phone || email) {
		member_update.phone = phone;
		member_update.email = email;
	}
	if (update.owner !== undefined) {
		member_update.owner = update.owner;
	}

	return Membership.findOneAndUpdate({
		_id: memberid,
		// active: true // Not sure why this is here? Any update makes the user active? Why?
	}, {
		$set: member_update
	}, {
		new: true
	});
}

function setMemberPrivileges(memberid,privileges) {
	var update = {
		owner: false
	};
	if (privileges[0] == 'owner') {
		update.owner = true;
	}
	return Membership.findOneAndUpdate({_id: memberid,active: true},
		{
			$set: update
		},{new: true});
}


async function deleteTeam(teamid) {
	var team = await Team.findById(teamid);
	if (!team) {
		return null;
	}
	var jobs = [];

	// Delete the images associated with prizes and members first
	job1 = Membership.find({team: teamid})
	.cursor()
	.eachAsync( async function(member,i) {
		if (member.photo && member.photo.imageid) {
			jobs.push(images.deleteImageBuffer(member.photo.imageid));
		}
	});

	job2 = TeamPrize.find({team: teamid})
	.cursor()
	.eachAsync( async function(prize,i) {
		if (prize.photo && prize.photo.imageid) {
			jobs.push(images.deleteImageBuffer(prize.photo.imageid));
		}
	});
	await Promise.all([job1,job2]);

	if (team.photo && team.photo.imageid) {
		jobs.push(images.deleteImageBuffer(team.photo.imageid));
	}
	jobs.push(Team.findByIdAndDelete(teamid));
	jobs.push(Membership.deleteMany({team: teamid}));
	jobs.push(TeamBounty.deleteMany({team: teamid}));	
	jobs.push(TeamPrize.deleteMany({team: teamid}));

	await Promise.all(jobs);
}




async function forEach(func) {
	var processed = 0;
	await Team.find({active: true})
	.select('_id')
	.cursor()
	.eachAsync(async function (team, i) {
		await func(team._id);
		processed++;
		});
	return processed;
}


async function deleteOrphans() {
	// Orphans are:
	//  members without teams
	//  bounties without teams
	//  teams without members
	//  prizes without teams
	await Membership.find({})
		.populate('team')
		.cursor()
		.eachAsync(async function(member) {
			if (!member.team) {
				console.log('delete member:',member._id);
				await Membership.findByIdAndDelete(member._id);
			}
		});

	await TeamBounty.find({})
		.populate('team')
		.cursor()
		.eachAsync(async function(bounty) {
			if (!bounty.team) {
				console.log('delete bounty:',bounty._id);
				await TeamBounty.findByIdAndDelete(bounty._id);
			}
		});

	await Team.find({})
		.cursor()
		.eachAsync(async function(team) {
			var member_count = await Membership.countDocuments({team: team._id,active: true});
			if (member_count === 0) {
				console.log('delete team:',team._id);
				await deleteTeam(team._id);
			}
		});
	await TeamPrize.find({})
	.populate('team')
	.cursor()
	.eachAsync(async function(prize) {
		if (!prize.team) {
			await TeamPrize.findByIdAndDelete(prize._id);
		}
	});

}

async function getDraftPrize(teamId) {
	let prize = await TeamPrize.findOne({team: teamId,draft: true});
	if (!prize) {
		prize = new TeamPrize({draft: true, active: false,team: teamId});
		await prize.save();
	}
	return prize;
}


function createPrize(teamid, name, url) {
	var u = undefined;
	if (url) {
		u = url.trim();
	}
	var prize = new TeamPrize({
		team: teamid,
		name: name.trim(),
		active: true,
		url: u
	});
	return prize.save();
}

function availablePrizes(teamid) {
	return TeamPrize.find({
		team: teamid,
		awardedto: undefined,
		active: true
	}).sort({
		name: 1
	});
}

function nextAvailablePrize(teamid) {
	return TeamPrize.findOne({
		team: teamid,
		awardedto: undefined,
		active: true
	}).sort({
		name: 1
	});
}


function getPrize(prizeid) {
	return TeamPrize.findOne({
		_id: prizeid,
		active: true
	});
}

function awardPrizeTo(prizeid, memberid) {
	return TeamPrize.findByIdAndUpdate(prizeid, {
		$set: {
			awardedto: memberid,
			awardedon: new Date()
		}
	}, {
		new: true
	});
}

function deactivePrize(prizeid) {
	return TeamPrize.findByIdAndUpdate(prizeid, {
		$set: {
			active: false
		}
	}, {
		new: true
	});
}

// Returns an object:
// Properties:
// contentType
// data
// Which can be return to the browser as:
// var photo = getPrizeImage(yourprizeid);
// res.contentType(photo.contentType);
// res.send(photo.data);
async function setPrizeImage(prizeid,image) {
    let prize = await TeamPrize.findById(prizeid);
    if (!prize) {
        return;
	}
	if (image) {
		if (image.data.length > 20000000) {
			throw 'Image size cannot exceed 20MB';        
		}
		prize.photo = {
			imageid: "prize_"+prize._id.toString(),
			contentType: 'image/jpeg'
		};
		await images.saveImageBuffer(prize.photo.imageid,image.data);	
	}
	await prize.save();
}

async function deletePrizeImage(prizeid) {
	let prize = await TeamPrize.findById(prizeid);
    if (!prize) {
        return;
	}
	if (prize.photo && prize.photo.imageid) {
		await images.deleteImageBuffer(prize.photo.imageid);	
	}
	prize.photo = null;
    await prize.save();
}


async function getPrizeImage(prizeid,size) {
	let prize = await TeamPrize.findById(prizeid);
	if (!prize || !prize.photo || !prize.photo.imageid) {
		return null;
	}
	let image = {
		contentType: prize.photo.contentType,
	};
	image.data = await images.getImageBuffer(prize.photo.imageid,size);
	return image;
}


/*
addUsersMembershipsToRequest()
Loads all the users membership information into the request.
req.memberships: an array of the user's member records for each team
req.membership: the current team membership the user has selected
req.session.membershipId is set the current membership
*/
async function addUsersMembershipsToRequest(req) {
	req.memberships = await getUsersMemberships(req.user._id);
	req.membership = undefined;

	// If a specific member was requested, use that, otherwise return null (indicating that the user can't be found)
	if (req.session.memberId) {
		req.membership = req.memberships.find( membership => membership._id.toString() == req.session.memberId);
		if (!req.membership) {
			return null;
		}
		delete req.session.memberId;		
	}

	// If the user does not have any teams, create one.
	if (req.memberships.length == 0) {
		await createTeam(req.user);
		req.memberships = await getUsersMemberships(req.user._id);
	}

	// The teamid should almost always be in the URL
	if (req.team) {
		req.membership = req.memberships.find( membership => membership.team._id.toString() == req.team._id.toString());
		// If the user is not a member of the team, default to their membership to their first membership
		if (!req.membership) {
			req.membership = req.memberships[0];
		}
	}
	//  But if it's not, (example '/thanks/'), 
	else {
		// Use the given membership, but if there isn't one
		if (!req.membership) {
			// Default to first team
			req.membership = req.memberships[0];
		}
		req.team = await getTeam(req.membership.team._id);
	}

	var results = await Promise.all([
		availablePrizes(req.membership.team._id),
		getNewMembers(req.membership.team._id)
	]);
	req.availablePrizes = results[0];
	req.newMembers = results[1];

	return req.membership;

}

async function getTeams(filter={}) {
	let limit = 20;
	let query = {};
	if (filter.whiteRabbit) {
		query.whiteRabbit = filter.whiteRabbit;
	}
	if (filter.active) {
		query.active = filter.active;
	}
	return Team.find(query).limit(limit).sort({name: 1});
}

async function sendCodeToVerifyContact(member) {
	if (!member.verifyCode) {
		member.verifyCode = cryptoRandomString({length: 6, type: 'numeric'});
		await member.save();
	}
	await notifyMember(member._id,
		'Verification Code',
		'Here is your th8nks.com verification code: '+member.verifyCode + 
		'. If you did not request a code, contact your team owner.');
};

async function associateMemberWithUser(member,user,code) {
	let result = {
		msg: 'Success',
		success: true,
		error: null
	}
	if (member.verifyCode != code) {
		result.msg = "Codes don't match";
		result.error = 'badcode';
		result.success = false;
		return result;
	}
	member.user = user._id;
	await member.save();
	return result;
}

async function getMemberById(memberId) {
	return Membership.findById(memberId);
}




module.exports = {
	activateBounty,
	addDefaultOwner,
	addMember,
	addMemberByContact,
	adjustSentCount,
	associateMemberWithUser,
	availablePrizes,
	awardPrizeTo,
	createBounty,
	createPrize,
	createTeam,
	createTeamName,
	deactivateBounty,
	deactivateMember,
	deactivePrize,
	deleteMemberImage,
	deletePrizeImage,
	deleteOrphans,
	deleteTeam,
	findMemberByContact,
	forEach,
	getBounties,
	getBounty,
	getMember,
	getMemberById,
	getMemberImage,
	getMemberByEmail,
	getMemberByUserId,
	getMemberships,
	getNewMembers,
	getOwners,
	getDraftPrize,
	getPrize,
	getPrizeImage,
	getTeam,
	getTeams,
	getTeamImage,
	getUsersMemberships,
	importMembers,
	incrementIdeaCount,
	incrementReceivedCount,
	incrementSentCount,
	addUsersMembershipsToRequest,
	nextAvailablePrize,
	notifyMember,
	notifyOwners,
	notifyTeam,
	resetMember,
	searchForMembers,
	sendCodeToVerifyContact,
	setMemberImage,
	setMemberPrivileges,
	setPrizeImage,
	setTeamImage,
	updateBounty,
	updateMember,
	updateMemberCount,
	updateTeam,
	updateUsersMemberships
}

