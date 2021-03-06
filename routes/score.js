let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');
let {Price} = require('../models/Price');
const {Coin} = require("../models/Coin");
let {Score} = require('../models/Score');

function ensure24(lst, key){
    let send = [];
    let i = 0
    lst.forEach((item) => {
        while (item._id > i){
            send.push(0);
            i++;
        }
        send.push(item[key]);
        i++;
    });
    while(i < 24){
        send.push(0);
        i++;
    }
    return send;
}

router.get('/mentions/:identifier',  async function (req, res, next) {
    const now = new Date(Date.now());
    let oneday = new Date(now - 1000 * 60 * 60 * 24); // subtract one day
    const ident = req.params['identifier'].toUpperCase();
    const coin = await Coin.findOne({identifier: ident}).exec();
    if(!coin){
        res.status(404);
        res.send(`Coin with identifier ${ident} not found`);
    }else {
        let q = Sentiment.aggregate()
            .match({identifiers: {$elemMatch: {$eq: ident}}, timestamp: {$gte: oneday}})
            .unwind('$identifiers')
            .match({identifiers: ident})
            .group({
                _id: {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60]}},
                mentions: {$sum: 1}
            })
            .sort("_id");
        await q.exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                let send = ensure24(result, "mentions");
                res.status(200);
                res.send(send);
            }
        });
    }
});

router.get('/sentiment/:identifier',async function(req, res, next){
    const now = new Date(Date.now());
    let oneday = new Date(now - 1000 * 60 * 60 * 24); // subtract one day
    const ident = req.params['identifier'].toUpperCase();
    const coin = await Coin.findOne({identifier: ident}).exec();
    if(!coin){
        res.status(404);
        res.send(`Coin with identifier ${ident} not found`);
    }else {
        let q = Sentiment.aggregate()
            .match({identifiers: {$elemMatch: {$eq: ident}}, timestamp: {$gte: oneday}})
            .unwind('$identifiers')
            .match({identifiers: ident})
            .group({
                _id: {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60]}},
                sentiment: {$avg: "$sentiment"}
            })
            .sort("_id");
        await q.exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                let send = ensure24(result, "sentiment");
                const sum = send.reduce((a, b) => a + b, 0);
                const avg = (sum / send.length) || 0;
                res.status(200);
                res.send({'24hours': avg, 'list': send});
            }
        });
    }
});

router.get('/interactions/:identifier', async function(req, res, next){
    const now = new Date(Date.now());
    let oneday = new Date(now - 1000 * 60 * 60 * 24); // subtract one day
    const ident = req.params['identifier'].toUpperCase();
    const coin = await Coin.findOne({identifier: ident}).exec();
    if(!coin){
        res.status(404);
        res.send(`Coin with identifier ${ident} not found`);
    }else {
        let q = Sentiment.aggregate()
            .match({identifiers: {$elemMatch: {$eq: ident}}, timestamp: {$gte: oneday}})
            .unwind('$identifiers')
            .match({identifiers: ident})
            .group({
                _id: {$trunc: {$divide: [{$subtract: [now, "$timestamp"]}, 1000 * 60 * 60]}},
                interactions: {$sum: "$interaction"}
            })
            .sort("_id");
        await q.exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                let send = ensure24(result, "interactions");
                res.status(200);
                res.send(send);
            }
        });
    }
});

router.get('/price/:identifier', async function(req, res, next){
    const ident = req.params['identifier'].toUpperCase();
    const coin = await Coin.findOne({identifier: ident}).exec();
    if(!coin){
        res.status(404);
        res.send(`Coin with identifier ${ident} not found`);
    }else {
        let q = Price.find({identifier: ident}).sort("-timestamp").limit(24);
        await q.exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                let send = []
                result.forEach((item) => {
                    send.push(item['price']);
                });
                while (send.length < 24) {
                    send.push(0);
                }
                res.status(200);
                res.send(send);
            }
        });
    }
});

router.post('/', async function (req, res, next){
    let body = req.body;
    let q = Coin.findOne({identifier: body.identifier});
    await q.exec(async function (error,result) {
        if (error){
            next(error)
        }
        else{
            if (result){
                body.timestamp = new Date(Date.now());
                await Score.create(body, function (err, obj) {
                    if (err) {
                        next(err);
                    } else {
                        res.status(201);
                        res.send(obj);
                    }
                })
            }
            else{
                res.status(404);
                res.send(`${body.identifier} not found`)
            }
        }
    })

})

router.get('/all',async function(req, res, next){
    let q = Score.find({});
    await q.exec(function(err, result){
        if(err){
            next(err)
        }
        else{
            if(result.length > 0){
                res.status(200);
                res.send(result);
            }
            else{
                res.status(404);
                res.send('Scores not found.')
            }
        }
    })
})

router.get('/:identifier', async function(req, res, next){
    let q = Score.find({identifier: req.params['identifier']});
    await q.exec(function(err, result){
        if(err){
            next(err)
        }
        else{
            if(result.length > 0){
                res.status(200);
                res.send(result);
            }
            else{
                res.status(404);
                res.send('Scores not found.')
            }
        }
    })
})

module.exports = router;
