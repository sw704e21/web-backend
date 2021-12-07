let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');
let {Coin} = require('../models/Coin');
let {Score} = require('../models/Score')

router.get('/all/names', async function(req, res, next){
    let q = Coin.find();
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            let names = [];
            result.forEach((obj) => {
                names.push(obj['name']);
            })
            res.status(200);
            res.send(names);
        }
    });
});

router.get('/all/:length?:sortParam?', async function (req, res, next) {
    let sortParam = req.query.sortParam; // put a minus in front if sort by descending
    let twoday = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // subtract two day
    let oneday = new Date(Date.now() - 1000 * 60 * 60 * 24 ); // subtract one day
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
        .sort(sortParam || "-mentions")
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
                    let s = Score.find().sort("-timestamp");
                    await s.exec(async function(err, scoreResult){
                        if(err){
                            next(err)
                        }
                        else{
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
                                    obj['final_score'] = scoreobj['final_score']
                                    send.push(obj);
                                }
                            });
                            if(sortParam === "final_score"){
                                send.sort((a,b)=> { return a['final_score'] > b['final_score'] ? 1 : ['final_score'] > a['final_score'] ? -1: 0});
                            }else if(sortParam === "-final_score"){
                                send.sort((a,b)=> { return a['final_score'] < b['final_score'] ? 1 : b['final_score'] < a['final_score'] ? -1: 0});
                            }
                            send.slice(0, parseInt(req.query.length) || 25)
                            res.send(send);
                        }
                    });
                }
            });
        }
    });
});

router.get('/search/:identifier',  async function(req, res, next){
    let query = req.params.identifier.toUpperCase();
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
                                console.log(scoreResult)
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
            if (result.length === 0) {
                res.status(404);
                res.send( `${req.params['identifier']} not found!`);
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
        }
    })
});

router.patch('/:url?:interactions?',  async function (req, res, next) {
   let q = Sentiment.updateOne({url: req.query.url}, {interaction: req.query.interactions});
   await q.exec(function(err, result) {
       if (err) {
           next(err);
       }else{
           if(result.matchedCount === 0){
               res.status(404)
               res.send(`${req.query.url} not found!`)
           }
           else if(result.matchedCount < 1){
               res.status(200)
               res.send(`${result.matchedCount} documents found, updated only one.`)
           }
           else {
               if(result.acknowledged){
                   res.status(200)
                   res.send(`Sentiment of post ${req.query.url} updated to ${req.query.interactions}`)
               }
               else{
                   res.status(500)
                   res.send("An unknown database error occurred")
               }

           }
       }
   })

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
                let e = Sentiment.find({url: body['url']});
                await e.exec(async function (err, result) {
                    if (err) {
                        next(err);
                    } else {
                        if (result.length > 0) {
                            res.status(403);
                            res.send("Post with url already exists: " + body['url']);
                        } else {
                            await Sentiment.create(body, function (err, obj, next) {
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
