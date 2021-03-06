let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');
let {Coin} = require('../models/Coin');
let {Score} = require('../models/Score')

router.get('/all/:length?:sortParam?', async function (req, res, next) {
    let sortParam = req.query.sortParam || "-mentions"; // put a minus in front if sort by descending
    let twoday = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // subtract two day
    let oneday = new Date(Date.now() - 1000 * 60 * 60 * 24 ); // subtract one day
    let twohour = new Date(Date.now() - 1000 * 60 * 60 * 2 );
    let q = Sentiment.aggregate()
        .match({timestamp: {$gte: twoday}})
        .unwind('$identifiers')
        .group({
            _id: "$identifiers",
            mostInteractions:
                {$sum:
                    {$cond: [
                        {$gte: ["$timestamp", oneday]},
                        "$interaction",
                        0
                    ]}
                },
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
                        {$and: [
                            {$gt: ['$sentiment', 0]},
                            {$gte: ["$timestamp", oneday]}
                        ]},
                        '$sentiment',
                        0
                    ]}
                },
            negSentiment:
                {$sum:
                    {$cond: [
                        {$and: [
                            {$lt: ['$sentiment', 0]},
                            {$gte: ["$timestamp", oneday]}
                        ]},
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
                },
            mostInfluence: {$max: "$influence"}
        })
        .project({_id: 0,
            identifier: "$_id",
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: {$abs: '$negSentiment'},
            relSentiment: {
                $divide: [
                    {$subtract: [
                        "$posSentiment",
                            {$abs: "$negSentiment"}
                    ]},
                    {$cond: [
                        {$eq: [
                            "$negSentiment",
                            0
                        ]},
                        1,
                        {$abs: "$negSentiment"}
                    ]}
                ]},
            relMentions:
                {$multiply: [
                    {$divide: [
                        {$subtract: [
                            "$mentions",
                            "$yesterdayMentions"
                        ]},
                        {$cond: [
                            {$eq: [
                                "$yesterdayMentions",
                                0
                            ]},
                            1,
                            "$yesterdayMentions"
                        ]}
                    ]},
                    100
                ]},
            mostInfluence: 1
        })
    // Add display names, icons and price
    await q.exec(async function (err, result) {
        if (err) {
            next(err)
        } else {
            let r = Coin.find();
            await r.exec(async function(err, nameres){
                if(err){
                    next(err);
                }else{
                    let s = Score.find({timestamp: {$gte: twohour}}).sort("-timestamp");
                    await s.exec(async function(err, scoreResult){
                        if(err){
                            next(err)
                        }
                        else{
                            let success = true;
                            let send = []
                            result.forEach((obj) => {
                                let namobj = nameres.find((i) => { return i['identifier'] === obj['identifier']});
                                let scoreobj = scoreResult.find((i) => { return i['identifier'] === obj['identifier']});
                                if (namobj && scoreobj) {
                                    obj['displayName'] = namobj['display_name'];
                                    obj['icon'] = namobj['icon'];
                                    obj['price'] = namobj['price'];
                                    obj['price_score'] = scoreobj['price_score']
                                    obj['social_score'] = scoreobj['social_score']
                                    obj['average_sentiment'] = scoreobj['average_sentiment']
                                    obj['correlation_rank'] = scoreobj['correlation_rank']
                                    obj['final_score'] = parseFloat(scoreobj['final_score'])
                                    send.push(obj);
                                }
                                else{
                                    success = false;
                                }
                            });
                            if(success) {
                                if (sortParam.startsWith('-')) {
                                    sortParam = sortParam.substr(1)
                                    send.sort((a, b) => {
                                        return a[sortParam] < b[sortParam] ? 1 : b[sortParam] < a[sortParam] ? -1 : 0
                                    })
                                } else {
                                    send.sort((a, b) => {
                                        return a[sortParam] < b[sortParam] ? -1 : b[sortParam] < a[sortParam] ? 1 : 0
                                    });
                                }
                                send = send.slice(0, parseInt(req.query.length) || 25)
                                res.status(200);
                                res.send(send);
                            }else{
                                res.status(500);
                                res.send("An unknown error occurred");
                            }
                        }
                    });
                }
            });
        }
    });
});

router.get('/search/:q',  async function(req, res, next){
    let query = req.params.q;
    let regex = new RegExp(query, 'i');
    let q = Coin.find()
    .or([{ identifier: regex}, { display_name: regex }])
    .select({icon: 1, identifier: 1, display_name: 1, _id: 0});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            res.status(200);
            res.send(result);
        }
    });
});

router.get('/:identifier/info', async function(req, res, next) {
    let twoday = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // subtract two day
    let oneday = new Date(Date.now() - 1000 * 60 * 60 * 24 ); // subtract one day
    const ident = req.params['identifier'].toUpperCase();
    let q = Sentiment.aggregate()
        .match({identifiers: {$elemMatch: {$eq: ident}} ,timestamp: {$gte: twoday}})
        .unwind('$identifiers')
        .group({
            _id: "$identifiers",
            mostInteractions:
                {$sum:
                        {$cond: [
                                {$gte: ["$timestamp", oneday]},
                                "$interaction",
                                0
                            ]}
                },
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
                        {$and: [
                                {$gt: ['$sentiment', 0]},
                                {$gte: ["$timestamp", oneday]}
                            ]},
                        '$sentiment',
                        0
                    ]}
                },
            negSentiment:
                {$sum:
                    {$cond: [
                        {$and: [
                            {$lt: ['$sentiment', 0]},
                            {$gte: ["$timestamp", oneday]}
                        ]},
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
                },
            mostInfluence: {$max: "$influence"}
        }).match({_id: ident})
        .project({_id: 0,
            identifier: "$_id",
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: {$abs: '$negSentiment'},
            relSentiment: {
                $divide: [
                    {$subtract: [
                            "$posSentiment",
                            {$abs: "$negSentiment"}
                        ]},
                    {$cond: [
                            {$eq: [
                                    "$negSentiment",
                                    0
                                ]},
                            1,
                            {$abs: "$negSentiment"}
                        ]}
                ]},
            relMentions:
                {$multiply: [
                        {$divide: [
                                {$subtract: [
                                        "$mentions",
                                        "$yesterdayMentions"
                                    ]},
                                {$cond: [
                                        {$eq: [
                                                "$yesterdayMentions",
                                                0
                                            ]},
                                        1,
                                        "$yesterdayMentions"
                                    ]}
                            ]},
                        100
                    ]},
            mostInfluence: 1
        });

    await q.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result.length === 0) {
                res.status(404);
                res.send(`${req.params['identifier'].toUpperCase()} not found`);
            } else {
                let send = result[0]
                let r = Coin.findOne({identifier: send['identifier']});
                await r.exec(async function (err, fresult) {
                    if (err) {
                        next(err);
                    } else {
                        let s = Score.find({identifier: send['identifier']}).sort('-timestamp').limit(1);
                        await s.exec(async function (err, scoreResult) {
                            if (err) {
                                next(err)
                            } else {
                                scoreResult = scoreResult[0]
                                send['displayName'] = fresult['display_name'];
                                send['icon'] = fresult['icon'];
                                send['price'] = fresult['price'];
                                send['price_score'] = scoreResult['price_score']
                                send['social_score'] = scoreResult['social_score']
                                send['average_sentiment'] = scoreResult['average_sentiment']
                                send['correlation_rank'] = scoreResult['correlation_rank']
                                send['final_score'] = scoreResult['final_score']
                                res.status(200);
                                res.send(send);
                            }
                        });
                    }
                });
            }
        }
    });
});

router.get('/:identifier/:age?', async function (req, res, next) {
    const age = (req.query.age || 7)
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * age);
    let now = new Date(Date.now());
    const ident = req.params['identifier'].toUpperCase();
    let r = Coin.findOne({identifier: ident});
    await r.exec(async function(err, result){
        if(err){
            next(err);
        }else{
            if(result){
                let q = Sentiment.aggregate()
                    .match({identifiers: {$elemMatch: {$eq: ident}}, timestamp: {$gte: date}})
                    .unwind('$identifiers')
                    .match({identifiers: ident})
                    .group({
                            "_id": {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60 ]}},
                            "mentions": {$sum: 1},
                            "interaction": {$sum: "$interaction"},
                            "sentiment": {$sum: "$sentiment"},
                            "negSentiment": {$sum: {$cond: [{$lt: ['$sentiment', 0]}, '$sentiment', 0]}},
                            "posSentiment": {$sum: {$cond: [{$gt: ['$sentiment', 0]}, '$sentiment', 0]}},
                            "mostInfluence": {$max: "$influence"}
                        }
                    )
                    .project({
                        _id: 0,
                        time: "$_id",
                        mentions: 1,
                        interaction: 1,
                        sentiment: 1,
                        negSentiment: {$abs: "$negSentiment"},
                        posSentiment: 1,
                        mostInfluence: 1
                    })
                    .sort("time")
                await q.exec(function (err, result) {
                    if (err) {
                        next(err);
                    }
                    else {
                        let send = [];
                        if (result.length < 24 * age){
                            let i = 0;
                            let j = 0;
                            while(i < 24 * age){
                                let item = result[j];
                                if(item && item.time === i){
                                    send.push(item);
                                    j++;
                                }else{
                                    send.push({
                                        time: i,
                                        mentions: 0,
                                        interaction: 0,
                                        sentiment: 0,
                                        negSentiment: 0,
                                        posSentiment: 0,
                                        mostInfluence: 0
                                    });
                                }
                                i++;
                            }
                        }else{
                            send = result;
                        }
                        res.statusCode = 200;
                        res.send(send);
                    }
                })
            }else{
                res.status(404);
                res.send( `${req.params['identifier']} not found!`);
            }
        }
    })

});

router.patch('/:uuid?:interactions?',  async function (req, res, next) {
    let s = await Sentiment.findOne({uuid: req.query.uuid}).exec();
    if(! s){
        res.status(404)
        res.send(`${req.query.uuid} not found!`)
    }else {
        let q = Sentiment.updateOne({uuid: req.query.uuid}, {interaction: req.query.interactions});
        await q.exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                if (result.matchedCount === 1 && result.acknowledged) {
                    res.status(200)
                    res.send(`Sentiment of post ${req.query.uuid} updated to ${req.query.interactions}`)
                } else {
                    res.status(500)
                    res.send("An unknown database error occurred")
                }

            }
        })
    }
});

router.post('/', async function (req, res, next) {
    let body = req.body;
    const ident = body['identifiers'];
    let q = Coin.find({identifier: {$in: ident}});
    await q.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result.length === 0) {
                res.status(404);
                res.send('Not tracking coin with identifier ' + ident);
            } else {
                let e = Sentiment.find({uuid: body['uuid']});
                await e.exec(async function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        if (result.length > 0) {
                            res.status(403);
                            res.send("Post with uuid already exists: " + body['uuid']);
                        } else {
                            await Sentiment.create(body, function (err, obj, next) {
                                if (err) {
                                    next(err);
                                } else {
                                    res.status(201);
                                    res.send(obj);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
})


module.exports = router;
