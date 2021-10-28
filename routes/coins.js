let express = require('express');
let router = express.Router();
let Sentiment = require('../models/Sentiment')
let Coin = require('../models/Coin')
let app = require('../app')
let cors = require('cors')
const {spawn} = require("child_process");


router.get('/',cors(app.corsOptions) , async function (req, res, next) {
    let twoday = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // subtract two day
    let oneday = new Date(Date.now() - 1000 * 60 * 60 * 24 ); // subtract one day
    let q = Sentiment.Sentiment.aggregate()
        .match({timestamp: {$gte: twoday}})
        .group({
            _id: "$coin",
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
            mostInteractions: 1,
            mentions: 1,
            posSentiment: 1,
            negSentiment: 1,
            relSentiment: {$divide: ["$posSentiment","$safeNeg"]},
            relMentions:
                {$multiply: [
                    {$divide: ["$mentions", "$safeYesterday"]},
                    100
                ]},
            mostInfluence: {$sum: 1}
        })
        .sort({mentions: "desc"})
        .limit(25);

    await q.exec(function (err, result) {
        if (err) {
            next(err)
        } else{
            res.send(result);
        }
    });
});

router.post('/', cors(app.corsOptions), async function (req, res) {
    let body = req.body
    await Sentiment.Sentiment.create(body, function (err, obj, next) {
        if (err) {
            next(err)
        } else {
            res.status(201)
            res.send(obj)
        }
    })
})


router.get('/:name', cors(app.corsOptions), async function (req, res, next) {
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



router.post('/track/:name-:ident', cors(app.corsOptions), async function(req, res, next){
   let name = req.params['name'].toLowerCase();
   let identifier = req.params['ident'].toUpperCase();
   let q = Coin.Coin.find({$or: [{name: name}, {identifier: identifier}]});
   await q.exec(async function (err, result) {
       if (err) {
           res.status(500)
           next()
       } else {
           if (result.length !== 0) {
               res.status(409)
               next("Already tracking a coin with given name or identifier:" + result)

           } else {
               await Coin.Coin.create({name: name, identifier: identifier}, function (err, obj, next) {
                   if (err) {
                       next(err);
                   } else {
                       const ls = spawn('python3', [app.crawlerPath + 'src/add_subreddit.py', JSON.stringify(name)])
                       ls.stdout.on('data', (data) => {
                           console.log(`stdout: ${data}`);
                       });

                       ls.stderr.on('data', (data) => {
                           console.log(`stderr: ${data}`);
                       });

                       ls.on('close', (code) =>{
                           console.log(`child proccess exited with code ${code}`)
                       })
                       // Start script in crawler
                       res.status(201)
                       res.send(obj)
                   }
               })
           }
       }
   });

});

module.exports = router;
