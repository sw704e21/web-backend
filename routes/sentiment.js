let express = require('express');
let router = express.Router();
let {Sentiment} = require('../models/Sentiment');

router.get('/ids/reddit/:age?', async function(req, res, next){
    const age = (req.query.age || 1);
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * age);
    let q = Sentiment.find({timestamp: {$gt: date}, source: {$eq: 'reddit'}}).select({uuid: 1});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else {
            let send = [];
            result.forEach((item)=>{
                send.push(item.uuid);
            });
            res.status(200);
            res.send(send);
        }
    });
});

router.get('/ids/twitter/:age?', async function(req, res, next){
    const age = (req.query.age || 1);
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * age);
    let q = Sentiment.find({timestamp: {$gt: date}, source: 'twitter'}).select({uuid: 1});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else {
            let send = [];
            result.forEach((item)=>{
                send.push(item.uuid);
            });
            res.status(200);
            res.send(send);
        }
    });
});


module.exports = router;
