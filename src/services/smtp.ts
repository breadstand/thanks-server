const nodemailer = require("nodemailer");


export function smtpSend(to:string,subject:string,message:string) {
    console.log(to,subject)
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
    console.log(mailOptions);
    if (process.env.EMAIL_ENABLED) {
        transporter.sendMail(mailOptions, function (err:any, info:any) {
            if(err)
                console.log(err)
        });
    }
    else {
        process.env.EMAIL_SENT_MESSAGE = JSON.stringify(mailOptions);
        //console.log(message);
    }
}

