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
module.exports = { safeCopy }