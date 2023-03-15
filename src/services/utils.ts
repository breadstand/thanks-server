import { Request, Response, NextFunction } from "express";

const jwt = require('jsonwebtoken');
const Types = require('mongoose').Types

export function verifyToken(req: Request,res: Response,next:NextFunction) {
    let token = null
    if (req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1]
    } 
    else if (req.query.token) {
        token = req.query.token
    }
    if (token === 'null') {
        return res.status(401).send('Unauthorized request')
    }
    let payload = jwt.verify(token,process.env.JWOTKEY)

    if (!payload) {
        return res.status(401).send('Unauthorized request')
    }
    req.userId = new Types.ObjectId(payload.subject)
    next()
}

const {phone} = require('phone');
const smtp = require('../services/smtp');
const sms = require('../services/sms');

export function sanitizeEmail(email:string):string|undefined {
    if (!email) {
      return undefined;
    }
    var e = email.trim().toLowerCase();
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(e)) {
      return e;
    }
    return undefined;
}
  
export function sanitizeName(name:string) {
  if (!name) {
    return undefined;
  }
  var newname = name.slice(0,80).trim();
  if (newname.length == 0) {
    return undefined;
  }
  return newname;
}


export function sanitizePhone(rawPhoneNumber:string) {
  var p = phone(rawPhoneNumber);
  var standardized_phone = p.phoneNumber;
  if (standardized_phone) {
    return standardized_phone;
  } else {
    return undefined;
  }
}
/*
function getLocale(req) {
    let locale = 'en-US';
    let accept_language = req.headers['accept-language'];
    
    if (accept_language) {
        let pieces = accept_language.split(',');
        locale = pieces[0];
    }
    return locale;
}*/

/*
async function notifyUs(subject, body) {
  let phone = process.env.SUPPORT_SMS;
  let email = process.env.SUPPORT_EMAIL;
  if (email) {
		await smtp.send(email, subject, body);
  }
  if (phone) {
		await sms.send(phone, body);
  }
}


async function emailUs(subject, body) {
  let email = process.env.SUPPORT_EMAIL;
  if (email) {
		await smtp.send(email, subject, body);
  }
}
*/