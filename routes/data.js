let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');
let {TFdict} = require('../models/tf-dict');
let {Coin} = require('../models/Coin');
const {Kafka} = require('kafkajs');
const server = "104.41.213.247:9092";
const topic = "PostsToProcess";

router.post('/', async function (req, res, next) {
    const body = req.body;
    console.log(body)
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

router.post('/tfdict/:name', async function(req, res, next){
    let dict = req.body;
    let n = req.params['name'];
    let q = Coin.findOne({name: n});
    await q.exec(async function(err, result){
       if(err){
           next(err);
       } else{
           if (result) {
               const ident = result['identifier'];
               let r = TFdict.findOne({identifier: ident});
               await r.exec(async function (err, result) {
                   if (err) {
                       next(err);
                   } else {
                       if (result) {
                           let s = TFdict.updateOne({identifier: ident}, {TFdict: dict});
                           await s.exec(function (err, update) {
                               if (err) {
                                   next(err);
                               } else {
                                   if (update.acknowledged) {
                                       res.status(200);
                                       res.send(`TFdict for ${ident} updated`);
                                   } else {
                                       res.status(500);
                                       res.send(`An unknown error occurred when updating the TFdict for ${ident}`);
                                   }
                               }
                           });
                       } else {
                           await TFdict.create({identifier: ident, TFdict: dict}, function (err, create) {
                               if (err) {
                                   next(err);
                               } else {
                                   res.status(201);
                                   res.send(`Created TFdict for ${create['identifier']}`);
                               }
                           });
                       }
                   }
               });
           } else{
               res.status(404);
               res.send(`Coin ${n} not found`);
           }
       }
    });
});

router.get('/tfdict/:identifier', async function(req, res, next){
    const ident = req.params['identifier'].toUpperCase();
    let q = TFdict.findOne({identifier: ident});
    await q.exec(function (err, result){
       if(err){
           next(err);
       } else{
           if(result){
               res.status(200);
               res.send(result.TFdict);
           }else{
               res.status(404);
               res.send(`TFdict for ${ident} not found`);
           }
       }
    });
});

module.exports = router;
