let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');
let {TFdict} = require('../models/tf-dict');
const {Coin} = require('../models/Coin');
const {Kafka} = require('kafkajs');
const arrayShuffle = require("array-shuffle");
const server = "104.41.213.247:9092";
let topic = "CoinsToTrack";
if(process.env.NODE_ENV === 'test'){
    topic = "testtopic";
}

router.post('/', async function (req, res, next) {
    const body = req.body;
    let q = Sentiment.find({url: body['url']});
    await q.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result.length > 0) {
                res.status(403);
                res.send("Post with url already in the system: " + body['url']);
            } else {
                const kafka = new Kafka({clientId: 'Post-producer', brokers: [server]});
                const producer = kafka.producer()

                await producer.connect()
                await producer.send({
                    topic: topic,
                    messages: [
                        {value: JSON.stringify(body)},
                    ],
                });
                await producer.disconnect()
                res.status(200);
                res.send();
            }
        }
    });

});

router.post('/tfdict/:identifier', async function(req, res, next){
    let dict = req.body;
    let ident = req.params['identifier'].toUpperCase();
    let r = Coin.findOne({identifier: ident});
    await r.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            if(result){
                let create = [];
                for(const [key, value] of Object.entries(dict.words)){
                    create.push({
                        identifier: ident,
                        timestamp: dict.timestamp,
                        word: key,
                        total: value,
                        url: dict.url
                    });
                }
                await TFdict.insertMany(create, function(err, result){
                    if(err){
                        next(err);
                    }else{
                        if(result) {
                            res.status(201);
                            res.send(`Updated TFdict for ${ident}`);
                        }else{
                            res.status(500);
                        }
                    }
                });
            }else{
                res.status(404);
                res.send(`Coin ${ident} not found`);
            }
        }
    });
});

router.get('/tfdict/:identifier/:length?', async function(req, res, next){
    const ident = req.params['identifier'].toUpperCase();
    const coin = await Coin.findOne({identifier: ident}).exec();
    if(!coin){
        res.status(404);
        res.send(`coin with identifier ${ident} not found`);
    }
    else {
        const length = parseInt(req.query.length) || 100;
        let q = TFdict.aggregate()
            .match({identifier: ident})
            .group({
                _id: "$word",
                total: {$sum: "$total"}
            })
            .sort("-total")
            .limit(length);
        await q.exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                if (result.length > 0) {
                    res.status(200);
                    res.send(result);
                } else {
                    res.status(404);
                    res.send(`TFdict for ${ident} not found`);
                }
            }
        });
    }
});

router.get('/urls/:identifier/:word/:length?', async function(req, res, next){
    const length = parseInt(req.query.length) || 25;
    const ident = req.params.identifier.toUpperCase();
    const w = req.params.word.toUpperCase();
    let q = TFdict.aggregate()
        .match({identifier: ident, word: w})
        .group({

            _id: "$word",
            urls: {$addToSet: "$url"}
        });
    await q.exec(function (err, result){
        if(err){
            next(err);
        }else{
            if(result && result[0] && result[0].urls.length > 0) {
                let send = result[0];
                send.urls = arrayShuffle(send.urls);
                send.urls = send.urls.slice(0, length);
                res.status(200);
                res.send(send);
            }else{
                res.status(404);
                res.send(`${w} not found for coin ${ident}`)
            }
        }
    })
})

router.delete('/tfdict', async function(req, res, next){
    let expire = new Date(Date.now() - 1000 * 60 * 60 * 12); // subtract 12 hours

    let q = TFdict.deleteMany({timestamp: {$lte: expire}});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            if(result){
                res.status(200);
                res.send(`Successfully deleted ${result.deletedCount} objects`);
            }else{
                res.status(500);
                res.send(`An unknown error occurred while trying to delete`);
            }
        }
    })
})

module.exports = router;
