let express = require('express');
let router = express.Router();
let Sentiment = require('./models/Sentiment')


router.get('/', async function (req, res, next) {
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24); // subtract one day
    console.log(date)
    let q = Sentiment.Sentiment.aggregate()
        .match({timestamp: {$gte: date}})

        .group({
            _id: "$coin",
            mostInteractions: {$max: "$interaction"},
            mentions: {$sum: 1},
            posSentiment: {$sum: {$cond: [{$gt: ['$sentiment', 0]}, '$sentiment', 0]}},
            negSentiment: {$sum: {$cond: [{$lt: ['$sentiment', 0]}, '$sentiment', 0]}}
        })
        .project({_id: 0,
            name: "$_id",
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: 1,
            safeNeg: {$cond: [{$eq: ["$negSentiment", 0]}, 1 , {$multiply: ["$negSentiment", -1]}]} }) // hidden value to avoid divide by zero
        .project({
            name: 1,
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: 1,
            relSentiment: {$divide: ["$posSentiment","$safeNeg"]}})
        .sort("mentions")
        .limit(25);

    await q.exec(function (err, result) {
        if (err) {
            next(err)
        } else{
            res.send(result);
        }
    });

});

router.get('/:name', async function (req, res, next) {
    let q = Sentiment.Sentiment.find({coin: req.params['name']});
    await q.exec(function (err, result) {
        if (err) {
            next(err);
        }
        else {
            if (result.length === 0) {
                res.status(404)
                res.send( `${req.params['name']} not found!`)
            }
            res.statusCode = 200
            res.send(result)
        }
    })
});

router.post('/', async function (req, res) {
    const body = req.body
    await Sentiment.Sentiment.create(body, function (err, obj, next) {
        if (err) {
            next(err)
        } else {
            res.status(201)
            res.send(obj)
        }
    })
})

module.exports = router;
