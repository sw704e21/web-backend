var express = require('express');
var router = express.Router();
const {Sentiment} = require("../models/Sentiment");
const {Coin} = require("../models/Coin");

router.get('/mult', async function(req, res, next){
    const ids = req.body['identifiers'];
    let q = Sentiment.find({identifier: {$in: ids}});
    await q.exec(function(err, result) {
        if(err){
            next(err);
        } else{
            res.status(200);
            res.send(result);
        }
    });
});

router.get('/tags', async function(req, res, next){
    let q = Coin.find();
    await q.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            for (const doc of result) {
                let tags = [doc.identifier, doc.display_name];
                await Coin.updateOne({_id: doc.id}, {tags: tags}).exec();
            }
            res.status(200);
            res.send();

        }
    });
});

router.get('/unwind', async function(req, res, next){
    let oneday = new Date(Date.now() - 1000 * 60 * 60 );
    let q = Sentiment.aggregate()
        .match({timestamp: {$gte: oneday}, identifiers: {$exists: true}})
        .unwind('$identifiers')
        .group({_id: "$identifiers", mentions: {$sum: 1}});
    await q.exec(function(err, result){
        if(err){
            next(err);
        }else{
            res.status(200);
            res.send(result);
        }
    })
});

router.get('/uuids', async function(req, res, next){
    let q = Sentiment.find({"$uuid": {$eq: ""} });
    await q.exec(async function(err, result){
        if(err){
            next(err);
        } else{
            console.log(result.length);


            for(const doc of result){
                if(doc.url.includes("www.reddit.com") && doc.uuid === ""){
                    const s = doc.url.split('/')
                    await Sentiment.updateOne({_id: doc._id}, {uuid: s[6]}).exec();
                }
            }
            res.status(200);
            res.send();
        }
    })
})

router.get('/identifiers', async function (req, res, next) {
    let q = Sentiment.find({"identifiers.0": {$exists: false} });
    await q.exec(async function (err, result) {
        if(err){
            next(err);
        } else{
            console.log(result.length);
            for(const doc of result){
                const ids = [doc.identifier];
                await Sentiment.updateOne({_id: doc._id}, {identifiers: ids}).exec();
            }
            res.status(200);
            res.send();
        }
    });
});


router.get('/date', function (req, res) {
    let a = new Date(Date.now())
    a.setDate(a.getDate() - 1)
    res.send(JSON.stringify({"date": Date.now()}))
});


router.delete('/:coin',async function (req, res, next) {
    await Sentiment.remove({coin: req.params['coin']}).exec(function(err, delres) {
        if(err) {
            next(err);
        } else {
            res.status(200);
            res.send('Successfully deleted objects:' + delres.deletedCount);
        }
    });

});

router.get('/posts', async function (req, res, next) {
    let q = Sentiment.find({identifiers: {$exists: true}});
    await q.exec(function (err, result) {
        if (err) {
            next(err);
        }
        else {
            res.status(200);
            res.send(result);
        }
    })
});

router.get('/urls',async function(req, res, next) {
    let q = Sentiment.find({url: { $not: /www/ }}).find({$expr: {$gt: [{$strLenCP: "$url"}, 8]}}).select({_id: 0, url: 1, length: {$strLenCP: "$url"}, new: {$concat: ["https://www.", {$substr: ["$url", 8, -1]}]}});
    await q.exec(function(err, result){
       if (err){
           next(err);
       }
       else{
           res.status(200);
           res.send(result);
       }
    });
});

router.get('/fix', async function(req, res, next){
    let q = Sentiment.find({url: { $not: /www/ }}).find({$expr: {$gt: [{$strLenCP: "$url"}, 8]}});
    await q.exec(async function (err, result) {
        if (err) {
            next(err);
        } else {
            let i = 0;
            for (const doc of result) {
                console.log(i);
                i++;
                const newurl = 'https://www.' + doc['url'].substr(8);
                await Sentiment.updateOne({_id: doc['_id']}, {url: newurl}).exec();
            }
            res.status(200);
            res.send()
        }
    })
});

module.exports = router;
