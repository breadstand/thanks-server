const jwt = require('jsonwebtoken');


function safeCopy(obj,properties) {
    let newObj = {}

    properties.forEach( (property,i) => {
        if (obj.hasOwnProperty(property)) {
            newObj[property] = obj[property]
        }
    })
    return newObj
}

/*
objectA = {
    name: 'David',
    dog: 'Sky',
    color: 'red'
}

objectB = safeCopy(objectA,['name','dog','last'])
console.log(objectB)
djohnson@Davids-MacBook-Air utils % node utils.js
{ name: 'David', dog: 'Sky' }

*/



function verifyToken(req,res,next) {
    if(!req.headers.authorization) {
        return res.status(401).send('Unauthorized request')
    }
    let token = req.headers.authorization.split(' ')[1]
    if (token === 'null') {
        return res.status(401).send('Unauthorized request')
    }
    let payload = jwt.verify(token,process.env.JWOTKEY)
    if (!payload) {
        return res.status(401).send('Unauthorized request')
    }
    req.userId = payload.subject
    next()
}

module.exports = { safeCopy, verifyToken }