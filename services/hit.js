const Hit  = require('./../models/hit').Hit;


function record(req) {
    var hit = new Hit({
        url: req.originalUrl
    });    
    if (req.user) {
        hit.user = req.user._id;
    };
    hit.save();    
}

module.exports = { record };
