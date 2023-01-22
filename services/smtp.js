const nodemailer = require("nodemailer");


function send(to,subject,message) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
                user: process.env.GMAIL_SENDER,
                pass: process.env.GMAIL_SENDER_PASSWORD
            }
        });

    let from = `${process.env.GMAIL_SENDER_NAME} <${process.env.GMAIL_SENDER}>`;  

    const mailOptions = {
        from: from, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: message // plain text body
        };
    //console.log(mailOptions);
    if (process.env.EMAIL_ENABLED) {
        transporter.sendMail(mailOptions, function (err, info) {
            if(err)
                console.log(err)
        });
    }
    else {
        process.env.EMAIL_SENT_MESSAGE = JSON.stringify(mailOptions);
        //console.log(message);
    }
}
module.exports = { send };

