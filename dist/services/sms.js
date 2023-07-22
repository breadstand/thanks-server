"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsSend = void 0;
var twilio = require('twilio');
function smsSend(phonenumber, message) {
    let smsMessage = {
        body: message,
        to: phonenumber,
        from: process.env.TWILIO_FROM_PHONE
    };
    if (process.env.NODE_ENV == "development") {
        process.env.SMS_SENT_MESSAGE = JSON.stringify(smsMessage);
        return new Promise((resolve, reject) => {
            console.log('Send To:', phonenumber);
            console.log(message);
            return resolve({ to: phonenumber });
        });
    }
    var client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return new Promise((resolve, reject) => {
        return client.messages.create(smsMessage).
            then((result) => {
            console.log(result);
            return resolve({ to: phonenumber });
        }).catch((err) => {
            console.log('error');
            return reject(err);
        });
    });
}
exports.smsSend = smsSend;
