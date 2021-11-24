let express = require('express');
let router = express.Router();
let app = require('../app');
let cors = require('cors');
let Sentiment = require('../models/Sentiment');

router.get('/mentions/:identifier', cors(app.corsOptions), async function (req, res, next) {
    const now = new Date(Date.now());
    let oneday = new Date(now - 1000 * 60 * 60 * 24); // subtract one day
    let q = Sentiment.Sentiment.aggregate()
        .match({identifier: req.params['identifier'], timestamp: {$gte: oneday}})
        .group({
            _id: {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60]}},
            mentions: {$sum: 1}
        })
        .sort({_id: 'desc'});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            let send = [];
            let i = 23
            result.forEach((item) => {
                while (item._id < i){
                    send.push(0);
                    i--;
                }
                send.push(item.mentions);
                i--;
            });
            while(i >= 0){
                send.push(0);
                i--;
            }
            res.status(200);
            res.send(send);
        }
    })
})


module.exports = router;
