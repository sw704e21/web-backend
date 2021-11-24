let express = require('express');
let router = express.Router();
let app = require('../app');
let cors = require('cors');
let Sentiment = require('../models/Sentiment');

function ensure24(lst, key){
    let send = [];
    let i = 23
    lst.forEach((item) => {
        while (item._id < i){
            send.push(0);
            i--;
        }
        send.push(item[key]);
        i--;
    });
    while(i >= 0){
        send.push(0);
        i--;
    }
    return send;
}

router.get('/mentions/:identifier', cors(app.corsOptions), async function (req, res, next) {
    const now = new Date(Date.now());
    let oneday = new Date(now - 1000 * 60 * 60 * 24); // subtract one day
    let q = Sentiment.Sentiment.aggregate()
        .match({identifier: req.params['identifier'].toUpperCase(), timestamp: {$gte: oneday}})
        .group({
            _id: {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60]}},
            mentions: {$sum: 1}
        })
        .sort({_id: 'desc'});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            let send = ensure24(result, "mentions");
            res.status(200);
            res.send(send);
        }
    });
});

router.get('/sentiment/:identifier', cors(app.corsOptions), async function(req, res, next){
    const now = new Date(Date.now());
    let oneday = new Date(now - 1000 * 60 * 60 * 24); // subtract one day
    let q = Sentiment.Sentiment.aggregate()
        .match({identifier: req.params['identifier'].toUpperCase(), timestamp: {$gte: oneday}})
        .group({
            _id: {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60]}},
            sentiment: {$avg: "$sentiment"}
        })
        .sort({_id: 'desc'});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            let send = ensure24(result,"sentiment");
            res.status(200);
            res.send(send);
        }
    });
});


module.exports = router;
