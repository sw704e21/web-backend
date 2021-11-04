let express = require('express');
let router = express.Router();
let Sentiment = require('../models/Sentiment');
let Coin = require('../models/Coin');
let app = require('../app');
let cors = require('cors');


router.get('/all/:length?',cors(app.corsOptions) , async function (req, res, next) {
    let twoday = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // subtract two day
    let oneday = new Date(Date.now() - 1000 * 60 * 60 * 24 ); // subtract one day
    let q = Sentiment.Sentiment.aggregate()
        .match({timestamp: {$gte: twoday}})
        .group({
            _id: "$coin",
            identifier: {$max: "$identifier"},
            mostInteractions: {$max: "$interaction"},
            mentions:
                {$sum:
                    {$cond: [
                        {$gte: ["$timestamp", oneday]},
                        1,
                        0
                    ]}
                },
            posSentiment:
                {$sum:
                    {$cond: [
                        {$gt: ['$sentiment', 0]},
                        '$sentiment',
                        0
                    ]}
                },
            negSentiment:
                {$sum:
                    {$cond: [
                        {$lt: ['$sentiment', 0]},
                        '$sentiment',
                        0
                    ]}
                },
            yesterdayMentions:
                {$sum:
                    {$cond: [
                        {$and: [
                            {$gte: ["$timestamp", twoday]},
                            {$lt: ["$timestamp", oneday]}
                        ]},
                        1,
                        0
                    ]}
                }
        })
        .project({_id: 0,
            name: "$_id",
            identifier: 1,
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: 1,
            yesterdayMentions: 1,
            safeYesterday:
                {$cond: [
                    {$eq: ["$yesterdayMentions", 0]},
                    1,
                    "$yesterdayMentions"
                ]},
            safeNeg:
                {$cond: [
                    {$eq: ["$negSentiment", 0]},
                    1 ,
                    {$multiply: ["$negSentiment", -1]}
                ]} // hidden value to avoid divide by zero
        })
        .project({
            name: 1,
            identifier: 1,
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: {$abs: '$negSentiment'},
            relSentiment: {$divide: ["$posSentiment","$safeNeg"]},
            relMentions:
                {$multiply: [
                    {$divide: ["$mentions", "$safeYesterday"]},
                    100
                ]},
            mostInfluence: {$sum: 1}
        })
        .sort({mentions: "desc"})
        .limit(parseInt(req.query.length) || 25);

    await q.exec(function (err, result) {
        if (err) {
            next(err)
        } else{
            res.send(result);
        }
    });
});

router.get('/:name/:age?', cors(app.corsOptions), async function (req, res, next) {
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * (req.query.age || 7)); 
    let q = Sentiment.Sentiment.find({coin: req.params['name'], timestamp: {$gte: date}});
    await q.exec(function (err, result) {
        if (err) {
            next(err);
        }
        else {
            if (result.length === 0) {
                res.status(404)
                res.send( `${req.params['name']} not found!`)
            }
            else {
                res.statusCode = 200
                res.send(result)
            }
        }
    })
});

router.post('/', cors(app.corsOptions), async function (req, res) {
    let body = req.body
    const name = body['coin'];
    let q = Coin.Coin.find({name: name});
    console.log(body);
    await q.exec(async function (err, result, next) {
        if (err) {
            next(err);
        } else {
            if (result.length === 0) {
                res.status(404);
                res.send('Not tracking coin with name ' + name);
            } else if (result.length > 1) {
                res.status(409);
                res.send('Multiple coins with name ' + name);
            } else {
                body['identifier'] = result[0]['identifier']
                let e = Sentiment.Sentiment.find({url: body['url']});
                await e.exec(async function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        if (result.length > 0) {
                            res.status(403);
                            res.send("Post with url already exists: " + body['url']);
                        } else {
                            await Sentiment.Sentiment.create(body, function (err, obj, next) {
                                if (err) {
                                    next(err);
                                } else {
                                    res.status(201);
                                    res.send(obj);
                                }
                            })
                        }
                    }
                });
            }
        }
    });
})


module.exports = router;
