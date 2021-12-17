let express = require('express');
let router = express.Router();
const {Coin} = require("../models/Coin");
const apikey = "dfb9d16f-b1ed-41cc-ab52-1a2384dfd566";
const https = require('https');
const {Kafka} = require('kafkajs');
const server = "104.41.213.247:9092";
let topic = "CoinsToTrack";
if(process.env.NODE_ENV === 'test'){
    topic = "testtopic";
}


router.get('/', async function (req, res, next) {
    let q = Coin.find({});
    await q.exec(function (err, result){
        if(err){
            next(err);
        }
        else{
            res.status(200);
            res.send(result);
        }
    });
});

router.post('/', async function(req, res, next){
    let body = req.body;
    let identifier = body['identifier'].toUpperCase();
    body['identifier'] = identifier;
    let q = Coin.find( {identifier: identifier});
    await q.exec(async function (err, result) {
        if (err) {
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
                        await Coin.create(body, async function (err, obj, next) {
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

router.put('/:id', async function(req, res,next) {
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

            let q = Coin.replaceOne({_id: req.params['id']},body);
            await q.exec(function (err, result){
                if(err){
                    next(err);
                }else{
                    if (result.acknowledged) {
                        res.status(200);
                        res.send(`Successfully updates ${body.identifier}`);
                    }
                    else{
                        res.status(500);
                        res.send(`An error occurred while trying to update ${body.identifier}`)
                    }
                }


            });


        });
    });

    request.on('error', (e) =>{
        next(e);
    });

    request.write(postData);
    request.end();


});

router.delete('/:id', async function (req, res, next) {
    const id = req.params['id'];
    let q = Coin.find({_id: id});
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
                let del = await Coin.remove({_id: id}).exec()
                res.status(200);
                res.send('Successfully deleted ' + del.deletedCount + " objects");
            }
        }
    });
});

router.get('/start', async function(req, res, next){
   let q =  Coin.find().select({tags: 1});
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

router.get('/tags', async function(req, res, next){
    let q = Coin.find().select({identifier: 1, tags: 1});
    await q.exec(function(err, result){
       if(err){
           next(err);
       } else{
           res.status(200);
           res.send(result);
       }
    });
})

module.exports = router;
