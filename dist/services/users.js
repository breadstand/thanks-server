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
exports.verifyUserContact = exports.findUserAndVerifyCode = exports.sendCodeToVerifyContact = exports.findUserByContact = exports.updateUser = exports.getUser = void 0;
const change_1 = require("../models/change");
const image_1 = require("../models/image");
const user_1 = require("../models/user");
const sms_1 = require("./sms");
const smtp_1 = require("./smtp");
const utils_1 = require("./utils");
const UserStats = require('../models/user').UserStats;
const UserAvailability = require('../models/user').UserAvailability;
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY, {
    apiVersion: process.env.STRIPE_API_VERSION
});
const Change = require('../models/change').Change;
const cryptoRandomString = require('crypto-random-string');
const { phone } = require('phone');
function createUser(contact, contactType, name = null) {
    return __awaiter(this, void 0, void 0, function* () {
        let sanitizedContact = null;
        if (contactType == 'email') {
            sanitizedContact = (0, utils_1.sanitizeEmail)(contact);
        }
        if (contactType == 'phone') {
            sanitizedContact = (0, utils_1.sanitizePhone)(contact);
        }
        let existingUser = yield findUserByContact(contact, contactType);
        if (existingUser) {
            let user = yield user_1.UserObject.findByIdAndUpdate(existingUser._id, {
                $set: {
                    name: name
                }
            }, { new: true });
            return user;
        }
        var user = new user_1.UserObject({
            name: name,
            contacts: [{
                    contact: sanitizedContact,
                    contactType: contactType
                }]
        });
        yield user.save();
        return user;
    });
}
function getUser(userId) {
    return user_1.UserObject.findById(userId);
}
exports.getUser = getUser;
function updateUser(user, update, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let change = new change_1.ChangeObject({
            item: 'user',
            id: user._id,
            user: byUserId,
            reason: "Update Information"
        });
        if (update.stripeCustomerId !== undefined) {
            change.record(user, 'stripeCustomerId', update.stripeCustomerId);
        }
        if (update.stripeSubscriptionId !== undefined) {
            change.record(user, 'stripeSubscriptionId', update.stripeSubscriptionId);
        }
        if (update.timeZone !== undefined) {
            change.record(user, 'timeZone', update.timeZone);
        }
        change.record(user, 'contacts', update.contacts);
        change.record(user, 'name', update.name);
        yield user_1.UserObject.findByIdAndUpdate(user._id, user);
        change.save();
        return user;
    });
}
exports.updateUser = updateUser;
function makeAdmin(user, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let change = new Change({
            item: 'user',
            id: user._id,
            user: byUserId,
            reason: "Update Admin Status"
        });
        change.record(user, 'admin', true);
        yield user_1.UserObject.findByIdAndUpdate(user._id, user);
        change.save();
        return user;
    });
}
function findUserByContact(contact, contactType) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield user_1.UserObject.findOne({
            "contacts.contact": contact,
            "contacts.contactType": contactType
        }).sort({ _id: 1 });
        return user;
    });
}
exports.findUserByContact = findUserByContact;
function deleteUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield user_1.UserObject.findById(userId);
        if (!user) {
            return;
        }
        if (user.image) {
            yield image_1.StoredImageObject.deleteOne({ _id: user.image });
        }
        try {
            yield user_1.UserObject.findByIdAndDelete(userId);
        }
        catch (e) {
            console.log(e);
        }
    });
}
;
function getStripeCustomerId(user, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }
        let result;
        let email = user.contacts.find(contact => contact.contactType == 'email');
        if (!email) {
            throw "User does not have email. Email required.";
        }
        result = yield stripe.customers.create({
            email: email,
            name: user.name
        });
        let change = new Change({
            item: 'user',
            id: user._id,
            user: byUserId,
            reason: "Create Stripe Customer ID"
        });
        change.record(user, 'stripeCustomerId', result.id);
        yield user_1.UserObject.findByIdAndUpdate(user._id, user);
        change.save();
        return user.stripeCustomerId;
    });
}
;
function getUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        return user_1.UserObject.find({})
            .sort({ _id: -1 })
            .limit(20);
    });
}
function toAddressForComparison(address) {
    let addressString = "";
    addressString += address.street + address.street2 + address.postalCode;
    return addressString.replace(/\s+/g, '').toUpperCase();
}
function addAddress(user, newAddress, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let newAddressForComparison = toAddressForComparison(newAddress);
        let addresses = yield user_1.AddressObject.find({ user: user._id });
        for (var i = 0; i < addresses.length; i++) {
            let existingAddress = addresses[i];
            let existingAddressForComparison = toAddressForComparison(existingAddress);
            if (newAddressForComparison == existingAddressForComparison) {
                newAddress.active = true;
                return updateAddress(existingAddress, newAddress, byUserId);
            }
        }
        let address = new user_1.AddressObject(newAddress);
        address.phone = (0, utils_1.sanitizePhone)(address.phone);
        address.user = user._id;
        address.active = true;
        yield address.save();
        yield syncAddressToStripe(user, address, byUserId);
        return address;
    });
}
function getAddress(addressId) {
    return __awaiter(this, void 0, void 0, function* () {
        var query = {
            _id: addressId,
        };
        return user_1.AddressObject.findOne(query);
    });
}
function updateAddress(address, update, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let change = new change_1.ChangeObject({
            item: 'address',
            id: address._id,
            user: byUserId,
            reason: "Update Address"
        });
        if (update.phone) {
            update.phone = (0, utils_1.sanitizePhone)(update.phone);
        }
        let addressProperties = ['name', 'organization', 'street', 'street2', 'city', 'state', 'postalCode', 'phone', 'active'];
        addressProperties.forEach(property => {
            let value = update[property];
            if (value !== undefined) {
                change.record(address, property, value);
            }
        });
        yield user_1.AddressObject.findByIdAndUpdate(address._id, address);
        change.save();
        let user = yield getUser(address.user);
        if (user) {
            yield syncAddressToStripe(user, address, byUserId);
        }
        return address;
    });
}
function syncAddressToStripe(user, address, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let stripeCustomerId = yield getStripeCustomerId(user, byUserId);
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
        let foundContact = user.contacts.find(contact => contact.contactType == 'email');
        if (foundContact) {
            update.email = foundContact.contact;
        }
        let customer = yield stripe.customers.update(stripeCustomerId, update);
        return customer;
    });
}
;
function getAddresses(userId, filter) {
    return __awaiter(this, void 0, void 0, function* () {
        var query = {
            active: true,
            user: userId,
        };
        return user_1.AddressObject.find(query).sort({ active: -1, updated: -1 });
    });
}
function deleteAddress(addressId, permanent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (permanent) {
            return user_1.AddressObject.findByIdAndDelete(addressId);
        }
        else {
            return user_1.AddressObject.findByIdAndUpdate(addressId, {
                $set: {
                    active: false
                }
            });
        }
    });
}
function getDefaultPaymentMethod(user) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!user.stripeCustomerId) {
            return null;
        }
        let stripeCustomer = yield stripe.customers.retrieve(user.stripeCustomerId);
        if (!stripeCustomer.invoice_settings || !stripeCustomer.invoice_settings.default_payment_method) {
            return null;
        }
        return stripe.paymentMethods.retrieve(stripeCustomer.invoice_settings.default_payment_method);
    });
}
function incrementStat(user, statName, byAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        let stat = yield UserStats.findOne({
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
        yield stat.save();
    });
}
function getStat(user, statName) {
    return __awaiter(this, void 0, void 0, function* () {
        let stat = yield UserStats.findOne({
            user: user._id,
            statName: statName
        });
        if (!stat) {
            return 0;
        }
        return stat.value;
    });
}
;
function setDefaultPaymentMethod(user, paymentMethodId, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        let stripeCustomerId = yield getStripeCustomerId(user, byUserId);
        yield stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
        let customer = yield stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId
            }
        });
    });
}
function search(searchFor, maxCount = 20) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = {
            $or: [
                { name: new RegExp(searchFor, 'i') },
                { "emails.email": new RegExp(searchFor, 'i') }
            ]
        };
        let users = yield user_1.UserObject.find(query)
            .limit(maxCount)
            .sort('name');
        return users;
    });
}
function hasNexus(user) {
    return __awaiter(this, void 0, void 0, function* () {
        // Deterime if the customer should be taxed
        let nexus = false;
        let addresses = yield getAddresses(user._id, { active: true });
        if (addresses.length > 0) {
            if (addresses[0].state == process.env.TAX_STATE) {
                return true;
            }
        }
        return false;
    });
}
function notifyUser(userId, subject, body) {
    return __awaiter(this, void 0, void 0, function* () {
        var user = yield getUser(userId);
        if (!user) {
            return;
        }
        user.contacts.forEach((contact) => __awaiter(this, void 0, void 0, function* () {
            if (contact.contactType == 'email') {
                let email = contact.contact;
                yield (0, smtp_1.smtpSend)(email, subject, body);
            }
            else if (contact.contactType == 'phone') {
                let phone = contact.contact;
                yield (0, sms_1.smsSend)(phone, body);
            }
        }));
    });
}
function sendCodeToVerifyContact(contact, contactType) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield findUserByContact(contact, contactType);
        if (!user) {
            user = yield createUser(contact, contactType);
        }
        if (!user) {
            return;
        }
        let verifyCode = cryptoRandomString({ length: 6, type: 'numeric' });
        let verifyCodeExpiration = new Date().getTime() + 15 * 1000 * 60;
        let foundContact = user.contacts.find(c => (c.contactType == contactType && c.contact == contact));
        if (foundContact) {
            foundContact.verifyCode = verifyCode;
            foundContact.verifyCodeExpiration = verifyCodeExpiration;
        }
        yield user_1.UserObject.findByIdAndUpdate(user._id, { contacts: user.contacts });
        yield notifyUser(user._id, 'Verification Code', 'Here is your breadstand.com verification code: ' + verifyCode +
            '. If you did not request a code, contact Breadstand.');
        return user;
    });
}
exports.sendCodeToVerifyContact = sendCodeToVerifyContact;
;
function findUserAndVerifyCode(contact, contactType, code) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield findUserByContact(contact, contactType);
        if (!user) {
            return null;
        }
        return verifyUserContact(user, contact, contactType, code);
    });
}
exports.findUserAndVerifyCode = findUserAndVerifyCode;
;
function verifyUserContact(user, contact, contactType, code) {
    return __awaiter(this, void 0, void 0, function* () {
        let currentTime = new Date().getTime();
        let foundContact = user.contacts.find(c => (c.contact == contact && c.contactType == contactType));
        if (foundContact &&
            foundContact.verifyCodeExpiration &&
            currentTime < foundContact.verifyCodeExpiration &&
            foundContact.verifyCode == code) {
            foundContact.verified = true;
            foundContact.verifyCode = null;
            foundContact.verifyCodeExpiration = null;
            let updatedUser = yield user_1.UserObject.findByIdAndUpdate(user._id, { contacts: user.contacts });
            // Remove contact from all other users.
            /*
            UserObject.find({"contact.contact":contact},
             { $pull: { "contact":contact} })
            */
            let usersWithContact = yield user_1.UserObject.find({ "contact.contact": contact });
            for (let i = 0; i < usersWithContact.length; i++) {
                let u = usersWithContact[i];
                // Don't update the current user
                if (String(u._id) == String(updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser._id)) {
                    break;
                }
            }
            return updatedUser;
        }
        return null;
    });
}
exports.verifyUserContact = verifyUserContact;
;
