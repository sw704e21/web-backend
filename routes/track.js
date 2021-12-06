let express = require('express');
let router = express.Router();
const cors = require("cors");
const Coin = require("../models/Coin");
const app = require("../app");
const apikey = "dfb9d16f-b1ed-41cc-ab52-1a2384dfd566";
const https = require('https');
const {Kafka} = require('kafkajs');
const server = "104.41.213.247:9092";
const topic = "CoinsToTrack";


router.get('/', cors(app.corsOptions), async function (req, res, next) {
    let q = Coin.Coin.find({});
    await q.exec(function (err, result){
        if(err){
            next(err);
        }
        else{
            console.log(result);
            res.status(200);
            res.send(result);
        }
    });
});

router.post('/', cors(app.corsOptions), async function(req, res, next){
    let body = req.body;
    let name = body['name'].toLowerCase();
    body['name'] = name;
    let identifier = body['identifier'].toUpperCase();
    body['identifier'] = identifier;
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
                let postData = JSON.stringify({
                    currency: 'USD',
                    code: identifier,
                    meta: true
                });
                let options = {
                    hostname: 'api.livecoinwatch.com',
                    path: '/coins/single',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apikey
                    }
                };
                let request = https.request(options, (response) => {
                    response.setEncoding('utf8');
                    response.on('data', async (data) => {
                        data = JSON.parse(data);
                        body['icon'] = data['webp32'];
                        await Coin.Coin.create(body, async function (err, obj, next) {
                            if (err) {
                                next(err);
                            } else {

                                let tosend = [];
                                body.tags.forEach((item) => {
                                    tosend.push({value: item})
                                });

                                const kafka = new Kafka({clientId: 'Tag-producer', brokers: [server]});
                                const producer = kafka.producer();

                                await producer.connect();
                                await producer.send({
                                    topic: topic,
                                    messages: tosend
                                });
                                await producer.disconnect();
                                res.status(201);
                                res.send(obj);
                            }
                        })
                    })
                });
                request.on('error', (e) =>{
                    next(e);
                });

                request.write(postData);
                request.end();

            }
        }
    });
});

router.put('/:id', cors(app.corsOptions), async function(req, res,next) {
    let body = req.body;
    let postData = JSON.stringify({
        currency: 'USD',
        code: body['identifier'],
        meta: true
    });
    let options = {
        hostname: 'api.livecoinwatch.com',
        path: '/coins/single',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apikey
        }
    };
    let request = https.request(options, (response) => {
        response.setEncoding('utf8');
        response.on('data', async (data) => {
            data = JSON.parse(data);
            body['icon'] = data['webp32'];

            let q = Coin.Coin.replaceOne({_id: req.params['id']},body);
            const result = await q.exec();
            if (result.acknowledged) {
                res.status(200);
                res.send(result.body);
            }
            else{
                next(result.error);
            }

        });
    });

    request.on('error', (e) =>{
        next(e);
    });

    request.write(postData);
    request.end();


})

router.delete('/:id', cors(app.corsOptions), async function (req, res, next) {
    const id = req.params['id'];
    let q = Coin.Coin.find({_id: id});
    await q.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result.length === 0) {
                res.status(404);
                res.send('Coin with id ' + id + ' not found!');
            } else if (result.length > 1) {
                res.status(500);
                next();
            } else {
                let del = await Coin.Coin.remove({_id: id}).exec()
                res.status(200);
                res.send('Successfully deleted ' + del.deletedCount + " objects");
            }
        }
    });
});

router.get('/start', cors(app.corsOptions), async function(req, res, next){
   let q =  Coin.Coin.find().select({tags: 1});
   await q.exec(async function (err, result) {
       if (err) {
           next(err);
       } else {
           let tosend = [];
           result.forEach((coin) => {
               coin.tags.forEach((tag) =>{
                   tosend.push({value: tag});
               });
           });
           const kafka = new Kafka({clientId: 'Tag-producer', brokers: [server]});
           const producer = kafka.producer();
           await producer.connect();
           await producer.send({
               topic: topic,
               messages: tosend
           });
           await producer.disconnect();

           res.status(200);
           res.send("Sent tags to crawler");
       }
   });
});




module.exports = router;
