let express = require('express');
let router = express.Router();
let Sentiment = require('../models/Sentiment');
let Coin = require('../models/Coin');
let app = require('../app');
let cors = require('cors');

router.get('/all/names', cors(app.corsOptions), async function(req, res, next){
    let q = Coin.Coin.find();
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

router.get('/all/:length?:sortParam?',cors(app.corsOptions) , async function (req, res, next) {
    let sortParam = req.query.sortParam; // put a minus in front if sort by descending
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
            mostInfluence: {$sum: 1}
        })
        .sort(sortParam || "-mentions")
        .limit(parseInt(req.query.length) || 25)

    // Add display names
    await q.exec(async function (err, result) {
        if (err) {
            next(err)
        } else {
            let r = Coin.Coin.find();
            await r.exec(function(err, nameres){
                if(err){
                    next(err);
                }else{
                    result.forEach((obj) => {
                        let namobj = nameres.find((i) => { return i['identifier'] === obj['identifier']})
                        obj['displayName'] = namobj['display_name']
                    })
                    res.send(result);
                }
            });


        }
    });
});

router.get('/search/:identifier', cors(app.corsOptions), async function(req, res, next){
    let query = req.params.identifier
    let regex = new RegExp(query, 'i');
    let q = Coin.Coin.find().or([{ identifier: regex}, { display_name: regex }]).select({identifier: 1, display_name: 1, _id: 0});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            let names = [];
            result.forEach((obj) => {
                names.push(obj['name']);
            })
            res.status(200);
            res.send(result);
        }
    });
});

router.get('/:identifier/:age?', cors(app.corsOptions), async function (req, res, next) {
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * (req.query.age || 7));
    let now = new Date(Date.now());
    let q = Sentiment.Sentiment.aggregate()
        .match({identifier: req.params['identifier'], timestamp: {$gte: date}})
        .group({
            "_id": {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60 ]}},
            "mentions": {$sum: 1},
            "interaction": {$sum: "$interaction"},
            "sentiment": {$sum: "$sentiment"},
            "negSentiment": {$sum: {$cond: [{$lt: ['$sentiment', 0]}, '$sentiment', 0]}},
            "posSentiment": {$sum: {$cond: [{$gt: ['$sentiment', 0]}, '$sentiment', 0]}}
            }
        )
        .project({
            _id: 0,
            time: "$_id",
            mentions: 1,
            interaction: 1,
            sentiment: 1,
            negSentiment: {$abs: "$negSentiment"},
            posSentiment: 1
        })
        .sort("time")
    await q.exec(function (err, result) {
        if (err) {
            next(err);
        }
        else {
            if (result.length === 0) {
                res.status(404)
                res.send( `${req.params['identifier']} not found!`)
            }
            else {
                res.statusCode = 200
                res.send(result)
            }
        }
    })
});

router.patch('/:url?:interactions?', cors(app.corsOptions), async function (req, res, next) {
   let q = Sentiment.Sentiment.updateOne({url: req.query.url}, {interaction: req.query.interactions});
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
