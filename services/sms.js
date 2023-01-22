
/*

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Set region
AWS.config.update({region: 'us-east-1'});

function send(phonenumber,message)
{

   // Create publish parameters
    var params = {
        Message: message,
        PhoneNumber: phonenumber,
    };

    // Create promise and SNS service object
    var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();

    // Handle promise's fulfilled/rejected states
    return publishTextPromise;
};
*/
var twilio = require('twilio');

function send(phonenumber,message) {


    let smsMessage = {
        body: message,
        to: phonenumber,
        from: process.env.TWILIO_FROM_PHONE
    };

    if (process.env.NODE_ENV == "development") {
        process.env.SMS_SENT_MESSAGE = JSON.stringify(smsMessage);
        return new Promise((resolve,reject) => {
            //console.log('Send To:',phonenumber);
            //console.log(message);
            return resolve({to: phonenumber});
        });
    }

    var client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return new Promise( (resolve,reject) => {
        return client.messages.create(smsMessage).
        then( result => {
            //console.log(result);
            return resolve({to: phonenumber});
        }).catch (err => {
            return reject(err);
        });
    })

}

module.exports = { send };