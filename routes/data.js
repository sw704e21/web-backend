let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');
let {TFdict} = require('../models/tf-dict');
const {Coin} = require('../models/Coin');
const {Kafka} = require('kafkajs');
const server = "104.41.213.247:9092";
const topic = "PostsToProcess";

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
    console.log(dict)
    let ident = req.params['identifier'];
    let r = Coin.findOne({identifier: ident});
    await r.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            if(result){
                let success = true;
                for(const [key, value] of Object.entries(dict.words)){
                    let q = TFdict.findOne({identifier: ident, word: key});
                    await q.exec(async function (err, result){
                       if(err){
                           next(err);
                       } else{
                           if(result){
                               let obj = {total: value, url: dict.url, timestamp: dict.timestamp};
                               await TFdict.updateOne({_id: result._id},{$inc: {total: value},
                                   $push: {occurrences: obj}}).exec(function(err, upres){
                                   if(err){
                                       next(err);
                                   } else{
                                       success &= upres.acknowledged;
                                   }
                               });
                           } else{
                               let occ = [{total: value, url: dict.url, timestamp: dict.timestamp}];
                               let obj = {identifier: ident, word: key, total: value.total, occurrences: occ};
                               await TFdict.create(obj, function(err, createRes){
                                   if(err){
                                       next(err);
                                   } else{
                                       success &= createRes;
                                   }
                               });
                           }
                       }
                    });
                }
                if(success){
                    res.status(200);
                    res.send(`Updated TFdict for ${ident}`);
                }else{
                    res.status(500);
                    res.send(`An error occurred during upding of TFdict for ${ident}`);
                }
            }else{
                res.status(404);
                res.send(`Coin ${ident} not found`);
            }
        }
    });
});

router.get('/tfdict/:identifier/:length?', async function(req, res, next){
    const ident = req.params['identifier'].toUpperCase();
    const length = req.query.length || 100;
    let q = TFdict.find({identifier: ident}).sort("-total").limit(length);
    await q.exec(function (err, result){
       if(err){
           next(err);
       } else{
           if(result){
               res.status(200);
               res.send(result);
           }else{
               res.status(404);
               res.send(`TFdict for ${ident} not found`);
           }
       }
    });
});

module.exports = router;
