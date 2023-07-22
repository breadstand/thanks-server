
var twilio = require('twilio');

export function smsSend(phonenumber:string,message:string) {


    let smsMessage = {
        body: message,
        to: phonenumber,
        from: process.env.TWILIO_FROM_PHONE
    };

    if (process.env.NODE_ENV == "development") {
        process.env.SMS_SENT_MESSAGE = JSON.stringify(smsMessage);
        return new Promise((resolve,reject) => {
            console.log('Send To:',phonenumber);
            console.log(message);
            return resolve({to: phonenumber});
        });
    }

    var client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return new Promise( (resolve,reject) => {
        return client.messages.create(smsMessage).
        then( (result:any) => {
            console.log(result);
            return resolve({to: phonenumber});
        }).catch ( (err:any) => {
            console.log('error')
            return reject(err);
        });
    })

}
