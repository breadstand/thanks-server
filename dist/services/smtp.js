"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smtpSend = void 0;
const nodemailer = require("nodemailer");
function smtpSend(to, subject, message) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_SENDER,
            pass: process.env.GMAIL_SENDER_PASSWORD
        }
    });
    let from = `${process.env.GMAIL_SENDER_NAME} <${process.env.GMAIL_SENDER}>`;
    const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: message // plain text body
    };
    //console.log(mailOptions);
    if (process.env.EMAIL_ENABLED) {
        transporter.sendMail(mailOptions, function (err, info) {
            if (err)
                console.log(err);
        });
    }
    else {
        process.env.EMAIL_SENT_MESSAGE = JSON.stringify(mailOptions);
        //console.log(message);
    }
}
exports.smtpSend = smtpSend;
