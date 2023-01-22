const User = require('../models/user').User;
const UserStats = require('../models/user').UserStats;

const UserAddress = require('../models/user').UserAddress;
const UserAvailability = require('../models/user').UserAvailability;
const utils = require('../services/utils');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY,{
    apiVersion: process.env.STRIPE_API_VERSION
});
const images = require('../services/images');
const mongoose = require('mongoose');
const Change = require('../models/change').Change;
const smtp = require('../services/smtp');
const sms = require('../services/sms');
const cryptoRandomString = require('crypto-random-string');


async function createUser(name, email) {
	email = utils.sanitizeEmail(email);
	name = utils.sanitizeName(name);
	if (!name) {
		throw new Error("Cannot create a user without a name");
	}

	if (email) {
		let existingUser = await findUserByEmail(email);
		if (existingUser) {
			existingUser = await User.findByIdAndUpdate(existingUser._id,{
				$set: {
					name: name
				}
			},{new: true});
			return existingUser;
		}	
	}

	var user = new User({
		name: name
	});
	if (email) {
		user.emails = [{
			email: email
		}];
	}
	await user.save();
	return user;
}

async function createUserByPhone(name, phone) {
	phone = utils.sanitizePhone(phone);
	name = utils.sanitizeName(name);
	if (!name) {
		throw new Error("Cannot create a user without a name");
	}

	if (phone) {
		let existingUser = await findUserByPhone(phone);
		if (existingUser) {
			existingUser = await User.findByIdAndUpdate(existingUser._id,{
				$set: {
					name: name
				}
			},{new: true});
			return existingUser;
		}	
	}

	var user = new User({
		name: name
	});
	if (phone) {
		user.phones = [{
			number: phone
		}];
	}
	await user.save();
	return user;
}



function getUser(userId) {
	return User.findById(userId);
}

async function updateUser(user,update,byUserId) {
	if (!(user instanceof User)) {
		throw new Error("First paramater of updateUser() should be User object not ObjectId");  // generates an error object with the message of Required

	}

	let change = new Change({
        item: 'user',
        id: user._id,
        user: byUserId,
        reason: "Update Information"
    });

	if (update.stripeCustomerId !== undefined) {
		change.record(user,'stripeCustomerId',update.stripeCustomerId);
	}
	if (update.stripeSubscriptionId !== undefined) {
		change.record(user,'stripeSubscriptionId',update.stripeSubscriptionId);
	}
	if (update.livesin !== undefined) {
		change.record(user,'livesin',update.livesin);
	}
	if (update.timeZone !== undefined) {
		change.record(user,'timeZone',update.timeZone);
	}
	change.record(user,'emails',update.emails);
	change.record(user,'name',update.name);
	change.record(user,'workedat',update.workedat);
	change.record(user,'livesin',update.livesin);
	change.record(user,'hometown',update.hometown);
	change.record(user,'wentto',update.wentto);
	change.record(user,'admin',update.admin);
	change.record(user,'emails',update.emails);
	await user.save();
	change.save();
	return user;
}

async function makeAdmin(user,byUserId) {
	let change = new Change({
        item: 'user',
        id: user._id,
        user: byUserId,
        reason: "Update Admin Status"
	});
	change.record(user,'admin',true);
	await user.save();
	change.save();
	return user;
}

async function findUserByEmail(email) {
	var e = utils.sanitizeEmail(email);
	if (!e) {
		return undefined;
	}

	var user = await User.findOne({"emails.email": e}).sort({_id: 1});
	return user;
}


async function findUserByPhone(phone) {
	var p = utils.sanitizePhone(phone);
	if (!p) {
		return undefined;
	}

	var user = await User.findOne({"phones.number": p}).sort({_id: 1});
	return user;
}


async function deleteUser(userId) {
	let user = await User.findById(userId);
	if (!user) {
		return;
	}
	if (user.image) {
		await deleteUserImage(user);
	}
	try {
		await User.findByIdAndDelete(userId);
	} catch (e) {
		console.log(e);
	}
};

async function getStripeCustomerId(user,byUserId) {
	if (!(user instanceof User)) {
		throw new Error("First paramater of getStripeCustomerId() should be User object not ObjectId");  // generates an error object with the message of Required

	}

	if (user.stripeCustomerId) {
		return user.stripeCustomerId;
	}
	let result;
	result = await stripe.customers.create({
		email: user.emails[0].email,
		name: user.name
	});
	let change = new Change({
        item: 'user',
        id: user._id,
        user: byUserId,
        reason: "Create Stripe Customer ID"
    });
	change.record(user,'stripeCustomerId',result.id);
	await user.save();
	change.save();
	return user.stripeCustomerId;
};



async function setUserImage(user,image) {
	if (!(user instanceof User)) {
		throw "First paramater of setUserImage() should be User object not ObjectId";
	}
	imageBuffer = await images.generateThumbnail(image.data,300,300);
	user.image = { 
		imageid: 'user_'+user._id.toString(),
		contentType: 'image/jpeg'
	};
	await images.saveImageBuffer(user.image.imageid,imageBuffer,{convertToJpeg: false,generateThumbnail: false});	
    await user.save();
}


async function getUserImage(user) {
	if (!(user instanceof User)) {
		throw "First paramater of getUserImage() should be User object not ObjectId";
	}
	if (!user.image || !user.image.imageid) {
		return null;
	}
	let image = {
		contentType: user.image.contentType
	};
	if (!image.contentType) {
		image.contentType = 'image/jpeg';
	}
	image.data = await images.getImageBuffer(user.image.imageid);
	return image;
}

async function deleteUserImage(user) {
	if (!(user instanceof User)) {
		throw "First paramater of deleteUserImage() should be User object not ObjectId";
	}
	await images.deleteImageBuffer(user.image.imageid);
	user.image = null;
	return user.save();
}

async function getUsers(filter) {
	return User.find({})
		.sort({_id: -1})
		.limit(20);
}


function toAddressForComparison(address) {
	let addressString = "";

	addressString += address.street+address.street2+address.postalCode;
	return addressString.replace(/\s+/g, '').toUpperCase();
}

async function addAddress(user,newAddress,byUserId) {
	if (!(user instanceof User)) {
		throw new Error("First paramater of addAddress() should be User object not ObjectId");  // generates an error object with the message of Required

	}

	let newAddressForComparison = toAddressForComparison(newAddress);
	let addresses = await UserAddress.find({user: user._id});

	for (var i = 0; i < addresses.length;i++) {
		let existingAddress = addresses[i];
		let existingAddressForComparison = toAddressForComparison(existingAddress);
		if (newAddressForComparison == existingAddressForComparison) {
			newAddress.active = true;
			return updateAddress(existingAddress,newAddress,byUserId);
		}
	}
	let address = new UserAddress(newAddress);
	address.phone = utils.sanitizePhone(address.phone);
	address.user = user._id;
	address.active = true;
	await address.save();
	await syncAddressToStripe(user,address,byUserId);
	return address;
}

async function getAddress(addressId,filter) {
	var query = {
		_id: addressId
	};

	if (filter) {
		if (filter.active) {
			if (filter.active == false) {
				query.active = false;
			} 
			else if (filter.active == 'all') {
				delete query.active;
			}
		}
	}
	return UserAddress.findOne(query);
}

async function updateAddress(address,update,byUserId) {
	if (!(address instanceof UserAddress)) {
		throw "First paramater of updateAddress() should be UserAddress not ObjectId";
	}


	let change = new Change({
        item: 'address',
        id: address._id,
        user: byUserId,
        reason: "Update Address"
    });

	if (update.phone) {
		update.phone = 	utils.sanitizePhone(update.phone);
	}

	let addressProperties = ['name','organization','street','street2','city','state','postalCode','phone','active'];
	addressProperties.forEach( property => {
		if (update[property] !== undefined) {
			change.record(address,property,update[property]);
		}
	});
	await address.save();
	change.save();
	let user = await getUser(address.user);
	await syncAddressToStripe(user,address,byUserId);
	return address;
}

async function syncAddressToStripe(user,address,byUserId) {
	let stripeCustomerId = await getStripeCustomerId(user,byUserId);

	let update = {
		name: user.name,
		address: {
			line1: address.street,
			line2: address.street2,
			city: address.city,
			state: address.state,
			postal_code: address.postalCode
		},
		phone: address.phone,
		shipping: {
			name: address.name,
			phone: address.phone,
			address: {
				line1: address.street,
				line2: address.street2,
				city: address.city,
				state: address.state,
				postal_code: address.postalCode
			}	
		}
	};
	if (user.emails.length > 0) {
		update.email = user.emails[0].email;
	}

	let customer = await stripe.customers.update(stripeCustomerId,update);
	return customer;
};


async function getAddresses(userId,filter) {
	var query = {
		active: true,
		user: userId
	};
	if (filter) {
		if (filter.active) {
			if (filter.active == false) {
				query.active = false;
			} 
			else if (filter.active == 'all') {
				delete query.active;
			}
		}
	}
	return UserAddress.find(query).sort({active: -1,updated: -1});
}

async function deleteAddress(addressId,permanent=false) {
	if (permanent) {
		return UserAddress.findByIdAndDelete(addressId);
	}
	else {
		return UserAddress.findByIdAndUpdate(addressId,{
			$set: {
				active: false
			}
		});	
	}
}

async function getDefaultPaymentMethod(user) {
	if (!user.stripeCustomerId) {
		return null;
	}
	let stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
	if (!stripeCustomer.invoice_settings || !stripeCustomer.invoice_settings.default_payment_method) {
		return null;
	}
	return stripe.paymentMethods.retrieve(stripeCustomer.invoice_settings.default_payment_method);
}



async function incrementStat(user,statName,byAmount) {
	let stat = await UserStats.findOne({
		user: user._id,
		statName: statName
	});
	if (!stat) {
		stat = new UserStats({
			user: user._id,
			statName: statName,
			value: 0
		});
	}
	stat.value += byAmount;
	await stat.save();
}

async function getStat(user,statName) {
	let stat = await UserStats.findOne({
		user: user._id,
		statName: statName
	});
	if (!stat) {
		return 0;
	}
	return stat.value;
};

async function setDefaultPaymentMethod(user,paymentMethodId,byUserId) {
	let stripeCustomerId = await getStripeCustomerId(user,byUserId);
    await stripe.paymentMethods.attach(paymentMethodId,{customer: stripeCustomerId});
    let customer = await stripe.customers.update(stripeCustomerId,{
        invoice_settings: {
            default_payment_method: paymentMethodId
        }
    });        
}

async function search(searchFor, maxCount = 20) {
	let query = {
		$or: [
			{ name: new RegExp(searchFor, 'i') },
			{ "emails.email": new RegExp(searchFor, 'i') }
		]
	}

	let users = await User.find(query)
		.limit(maxCount)
		.sort('name');

	return users;
}


async function hasNexus(user) {
	// Deterime if the customer should be taxed
	let nexus = false;
	let addresses = await getAddresses(user._id);
	if (addresses.length > 0) {
		if (addresses[0].state == process.env.TAX_STATE) {
			return true;
		}	
	}
	return false;
}


async function notifyUser(userId, subject, body) {
	var user = await getUser(userId);

	for(let i = 0; i < user.emails.length;i++) {
		let email = user.emails[i].email;
		//console.log(body);
		await smtp.send(email, subject, body);
	}
	for(let i = 0; i < user.phones.length;i++) {
		let phone = user.phones[i].number;
		//console.log(body);
		await sms.send(phone,body);
	}


}


async function sendCodeToVerifyEmail(email) {
	let user = await findUserByEmail(email);
	if (!user) {
		user = await createUser(email,email);
	}

	user.verifyCode = cryptoRandomString({length: 6, type: 'numeric'});
	user.verifyCodeExpiration = new Date().getTime() + 15*1000 * 60;
	await user.save();
	await notifyUser(user._id,
		'Verification Code',
		'Here is your breadstand.com verification code: '+user.verifyCode + 
		'. If you did not request a code, contact Breadstand.');

	return user;
};

async function sendCodeToVerifyPhone(phone) {
	let user = await findUserByPhone(phone);
	if (!user) {
		user = await createUserByPhone(phone,phone);
	}

	user.verifyCode = cryptoRandomString({length: 6, type: 'numeric'});
	user.verifyCodeExpiration = new Date().getTime() + 15*1000 * 60;
	await user.save();
	await notifyUser(user._id,
		'Verification Code',
		'Here is your breadstand.com verification code: '+user.verifyCode + 
		'. If you did not request a code, contact Breadstand.');

	return user;
};




async function verifyCode(email,code) {
	let result = {
		success: false,
		error: "The code is invalid.",
		user: null
	};

	let user = await findUserByEmail(email);
	let currentTime = new Date().getTime();
	//console.log(user,code,email,currentTime)
	if (user && 
		code && 
		user.verifyCode && 
		code == user.verifyCode &&
		currentTime < user.verifyCodeExpiration ) {
		//console.log('Verified');
		user.verifyCode = undefined;
		user.verifyCodeExpiration = undefined;
		await user.save();
		result.user = user;
		result.error = null;
		result.success = true;
		return result;
	}
	else {
		//console.log('Not verified',code == user.verifyCode,currentTime < user.verifyCodeExpiration);
	}

	return result;
};


async function getAvailability(userId) {
	let availability = await UserAvailability.findOne({user: userId});
	if (!availability) {
		availability = new UserAvailability({ user: userId});
		for (let dow = 0; dow < 7; dow++) {
			let a = {
				startHour: 8,
				endHour: 16,
				available: true
			}
			availability.daysOfTheWeek.push(a);
		}
		await availability.save();
	}
	return availability;	
	
}

async function addLocation(userId,postalCode) {
	let availability = await getAvailability(userId);
    let match = availability.postalCodes.find( el => el == postalCode);
    if (!match) {
        availability.postalCodes.push(postalCode);
        await availability.save();
    }
    
}

async function deleteLocation(userId,postalCode) {
	let availability = await getAvailability(userId);
    let match = availability.postalCodes.findIndex( el => el == postalCode);
    if (match >= 0) {
        availability.postalCodes.splice(match,1);
        await availability.save();
    }
    
}

async function getByLocationAvailability(postalCodes) {
	let schedules = await UserAvailability.find({postalCodes: {$in: postalCodes}})
		.populate('user');
	return schedules;
}


module.exports = {
	addAddress,
	addLocation,
	createUser,
	createUserByPhone,
	deleteAddress,
	deleteLocation,
	deleteUser,
	deleteUserImage,
	findUserByEmail,
	findUserByPhone,
	getAddress,
	getAddresses,
	getAvailability,
	getByLocationAvailability,
	getDefaultPaymentMethod,
	getStat,
	getStripeCustomerId,
	getUser,
	getUsers,
	getUserImage,
	hasNexus,
	incrementStat,
	makeAdmin,
	notifyUser,
	search,
	sendCodeToVerifyEmail,
	sendCodeToVerifyPhone,
	setDefaultPaymentMethod,
	setUserImage,
	updateAddress,
	updateUser,
	verifyCode
};