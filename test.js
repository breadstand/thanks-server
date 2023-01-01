

incomingObject = {
    name: 'David',
    id: 134,
    dog: 'Sky'
}
const queryObject = (({name,id,color}) => ({name,id,color}))(incomingObject)
console.log(queryObject)