import { ObjectId } from "mongoose";
import { ChangeObject } from "../models/change";
import { StoredImage, StoredImageObject } from "../models/image";
import { Address, AddressFilter, AddressObject, User, UserContact, UserObject, VerifyCodeResult } from "../models/user";
import { smsSend } from "./sms";
import { smtpSend } from "./smtp";
import { sanitizeEmail, sanitizePhone } from "./utils";

const UserStats = require('../models/user').UserStats;

const UserAvailability = require('../models/user').UserAvailability;
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY,{
    apiVersion: process.env.STRIPE_API_VERSION
});
const Change = require('../models/change').Change;
const cryptoRandomString = require('crypto-random-string');
const {phone} = require('phone');

   
async function createUser(contact:string,contactType:string,name:string|null=null) {
    let sanitizedContact = null
    if (contactType == 'email') {
        sanitizedContact = sanitizeEmail(contact);
    }
    if (contactType == 'phone') {
        sanitizedContact = sanitizePhone(contact);
    }

    let existingUser = await findUserByContact(contact,contactType)
    if (existingUser) {
        let user = await UserObject.findByIdAndUpdate(existingUser._id,{
            $set: {
                name: name
            }
            },{new: true});
        return user;
    }

	var user = new UserObject({
		name: name,
        contacts: [{
            contact: sanitizedContact,
            contactType: contactType}]
	});

	await user.save();
	return user;
}

export function getUser(userId:ObjectId) {
	return UserObject.findById(userId);
}

export async function updateUser(user: User,update:User,byUserId:ObjectId) {
	let change = new ChangeObject({
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
	if (update.timeZone !== undefined) {
		change.record(user,'timeZone',update.timeZone);
	}
	change.record(user,'contacts',update.contacts);
	change.record(user,'name',update.name);

    await UserObject.findByIdAndUpdate(user._id,user)
	change.save();
	return user;
}


async function makeAdmin(user: User,byUserId:ObjectId) {
	let change = new Change({
        item: 'user',
        id: user._id,
        user: byUserId,
        reason: "Update Admin Status"
	});
	change.record(user,'admin',true);
	await UserObject.findByIdAndUpdate(user._id,user);
	change.save();
	return user;
}

export async function findUserByContact(contact:string,contactType:string) {
	let user = await UserObject.findOne({
            "contacts.contact": contact, 
            "contacts.contactType": contactType}).sort({_id: 1});
	return user;
}

export async function deleteUser(userId: ObjectId) {
	let user = await UserObject.findById(userId);
	if (!user) {
		return;
	}
	if (user.image) {
		await StoredImageObject.deleteOne({_id: user.image});
	}
	try {
		await UserObject.findByIdAndDelete(userId);
	} catch (e) {
		console.log(e);
	}
};

export async function getStripeCustomerId(user:User,byUserId:ObjectId) {
	if (user.stripeCustomerId) {
		return user.stripeCustomerId;
	}
	let result;

	result = await stripe.customers.create({
	});
	let change = new ChangeObject({
        item: 'user',
        id: user._id,
        user: byUserId,
        reason: "Create Stripe Customer ID"
    });
	change.record(user,'stripeCustomerId',result.id);
    await UserObject.findByIdAndUpdate(user._id,user)
	change.save();
	return user.stripeCustomerId;
};



async function getUsers() {
	return UserObject.find({})
		.sort({_id: -1})
		.limit(20);
}


function toAddressForComparison(address:Address) {
	let addressString = "";

	addressString += address.street+address.street2+address.postalCode;
	return addressString.replace(/\s+/g, '').toUpperCase();
}

async function addAddress(user: User,newAddress:Address,byUserId: ObjectId) {
	let newAddressForComparison = toAddressForComparison(newAddress);
	let addresses = await AddressObject.find({user: user._id});

	for (var i = 0; i < addresses.length;i++) {
		let existingAddress = addresses[i];
		let existingAddressForComparison = toAddressForComparison(existingAddress);
		if (newAddressForComparison == existingAddressForComparison) {
			newAddress.active = true;
			return updateAddress(existingAddress,newAddress,byUserId);
		}
	}
	let address = new AddressObject(newAddress);
	address.phone = sanitizePhone(address.phone);
	address.user = user._id;
	address.active = true;
	await address.save();
	await syncAddressToStripe(user,address,byUserId);
	return address;
}

async function getAddress(addressId:ObjectId) {
	var query = {
		_id: addressId,
	};

	return AddressObject.findOne(query);
}

async function updateAddress(address: Address,update:Address,byUserId:ObjectId) {

	let change = new ChangeObject({
        item: 'address',
        id: address._id,
        user: byUserId,
        reason: "Update Address"
    });

	if (update.phone) {
		update.phone = 	sanitizePhone(update.phone);
	}

	let addressProperties = ['name','organization','street','street2','city','state','postalCode','phone','active'];
	addressProperties.forEach( property => {
        let value = update[property as keyof Address]
		if (value !== undefined) {
			change.record(address,property,value);
		}
	});
	await AddressObject.findByIdAndUpdate(address._id,address);
	change.save();
	let user = await getUser(address.user);
    if (user) {
        await syncAddressToStripe(user,address,byUserId);
    }
	return address;
}

async function syncAddressToStripe(user:User,address:Address,byUserId:ObjectId) {
	let stripeCustomerId = await getStripeCustomerId(user,byUserId);

	let update = {
		name: user.name,
        email: '',
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
    let foundContact = user.contacts.find( contact => contact.contactType =='email')
    if (foundContact) {
		update.email = foundContact.contact;
    }

	let customer = await stripe.customers.update(stripeCustomerId,update);
	return customer;
};


async function getAddresses(userId:ObjectId,filter:AddressFilter) {
	var query = {
		active: true,
		user: userId,
	};
	return AddressObject.find(query).sort({active: -1,updated: -1});
}

async function deleteAddress(addressId:ObjectId,permanent=false) {
	if (permanent) {
		return AddressObject.findByIdAndDelete(addressId);
	}
	else {
		return AddressObject.findByIdAndUpdate(addressId,{
			$set: {
				active: false
			}
		});	
	}
}

async function getDefaultPaymentMethod(user:User) {
	if (!user.stripeCustomerId) {
		return null;
	}
	let stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
	if (!stripeCustomer.invoice_settings || !stripeCustomer.invoice_settings.default_payment_method) {
		return null;
	}
	return stripe.paymentMethods.retrieve(stripeCustomer.invoice_settings.default_payment_method);
}



async function incrementStat(user:User,statName:string,byAmount:number) {
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

async function getStat(user:User,statName:string) {
	let stat = await UserStats.findOne({
		user: user._id,
		statName: statName
	});
	if (!stat) {
		return 0;
	}
	return stat.value;
};

async function setDefaultPaymentMethod(user:User,paymentMethodId:string,byUserId:ObjectId) {
	let stripeCustomerId = await getStripeCustomerId(user,byUserId);
    await stripe.paymentMethods.attach(paymentMethodId,{customer: stripeCustomerId});
    let customer = await stripe.customers.update(stripeCustomerId,{
        invoice_settings: {
            default_payment_method: paymentMethodId
        }
    });        
}

async function search(searchFor:string, maxCount = 20) {
	let query = {
		$or: [
			{ name: new RegExp(searchFor, 'i') },
			{ "emails.email": new RegExp(searchFor, 'i') }
		]
	}

	let users = await UserObject.find(query)
		.limit(maxCount)
		.sort('name');

	return users;
}


async function hasNexus(user:User) {
	// Deterime if the customer should be taxed
	let nexus = false;
	let addresses = await getAddresses(user._id,{active: true});
	if (addresses.length > 0) {
		if (addresses[0].state == process.env.TAX_STATE) {
			return true;
		}	
	}
	return false;
}


async function notifyUser(userId:ObjectId, subject:string, body:string) {
	console.log('notifyUser()',body)
	var user = await getUser(userId);

    if (!user) {
        return
    }

    user.contacts.forEach( async contact =>  {
        if (contact.contactType == 'email') {
            let email = contact.contact
            await smtpSend(email, subject, body);
        }
        else if (contact.contactType == 'phone') {
            let phone = contact.contact
			console.log('smsSend',phone)
            await smsSend(phone,body);
        }
    })

}


export async function sendCodeToVerifyContact(contact:string,contactType:string) {
	let user:User|null = await findUserByContact(contact,contactType);
	if (!user) {
		user = await createUser(contact,contactType);
	}
    if (!user) {
        return
    }

	user = await addContact(user,contact,contactType)
	return user;
};



export async function addContact(user:User,contact:string,contactType:string) {

	console.log('addContact')
	let verifyCode = cryptoRandomString({length: 6, type: 'numeric'});
	let verifyCodeExpiration = new Date().getTime() + 15*1000 * 60;

    let foundContact = user.contacts.find( c => 
        (c.contactType == contactType && c.contact == contact))

    if (foundContact) {
        foundContact.verifyCode = verifyCode
        foundContact.verifyCodeExpiration = verifyCodeExpiration
    } else {
		let newContact:UserContact = {
			contact: contact,
			contactType: contactType,
			verifyCode: verifyCode,
			verifyCodeExpiration: verifyCodeExpiration,
			verified: false,
			failed: 0
		}
		user.contacts.push(newContact)
	}


	await UserObject.findByIdAndUpdate(user._id,{contacts: user.contacts});
	await notifyUser(user._id,
		'Verification Code',
		'Here is your https://thanks.breadstqnd.us/ verification code: '+ verifyCode + 
		'. If you did not request a code, contact Breadstand.');

	return user;
};




export async function findUserAndVerifyCode(contact:string,contactType:string,code:string) {
    let user = await findUserByContact(contact,contactType);
    if (!user) {
        return null
    }

	return verifyUserContact(user,contact,contactType,code)
};


export async function verifyUserContact(user:User,contact:string,contactType:string,code:string) {

	let currentTime = new Date().getTime();
    let foundContact = user.contacts.find( c => 
        (c.contact == contact && c.contactType == contactType))
    if (foundContact && 
        foundContact.verifyCodeExpiration && 
        currentTime < foundContact.verifyCodeExpiration && 
        foundContact.verifyCode == code) {
			console.log('verified')
		foundContact.verified = true
        foundContact.verifyCode = null
        foundContact.verifyCodeExpiration = null
        let updatedUser = await UserObject.findByIdAndUpdate(user._id,
			{contacts: user.contacts},{new: true})
		

		// Remove contact from all other users.
		/*
		UserObject.find({"contact.contact":contact},
		 { $pull: { "contact":contact} })
		*/

		let usersWithContact = await UserObject.find({"contact.contact":contact})
		for (let i = 0; i < usersWithContact.length;i++) {
			let u = usersWithContact[i]
			// Don't update the current user
			if ( String(u._id) == String(updatedUser?._id)) {
				break
			}


		}


		return updatedUser;
    }

	return null;
};


export async function removeContact(user:User,contact:string,contactType:string) {

    let foundContact = user.contacts.findIndex( c => 
        (c.contactType == contactType && c.contact == contact))


    if (foundContact < 0) {
		return null
    }
	user.contacts.splice(foundContact,1)

	await UserObject.findByIdAndUpdate(user._id,{contacts: user.contacts});
	return user;
};
