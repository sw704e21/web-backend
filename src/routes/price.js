let express = require('express');
let router = express.Router();
let app = require('../app');
let Price = require('../models/Price');
let Coin = require('../models/Coin');
const cors = require("cors");

router.get('/', cors(app.corsOptions), async function(req, res, next){
    let q = Price.Price.find();
    await q.exec(function(err, result) {
        if(err){
            next(err);
        } else{
            res.status(200);
            res.send(result);
        }
    });
});


router.post('/', cors(app.corsOptions), async function(req, res, next){
    let body = req.body;
    let q = Coin.Coin.findOne({identifier: body['identifier']});
    await q.exec(async function (err, result){
        if (err){
            next(err);
        } else{
            if(result){
                if(!body['timestamp']){
                    body['timestamp'] = Date.now();
                }
                await Price.Price.create(body, async function (err, obj) {
                    if (err) {
                        next(err);
                    } else {
                        let r = Price.Price.find({identifier: body['identifier']});
                        await r.exec(async function (err, result) {
                            if (err) {
                                next(err);
                            } else {
                                if (result.length > 24) {
                                    let old = result.sort(
                                        (a, b) => {
                                            return a['timestamp'] > b['timestamp'] ? 1 :
                                                b['timestamp'] > a['timestamp'] ? -1 : 0
                                        })[0];
                                    let s = Price.Price.deleteOne({_id: old['_id']});
                                    await s.exec(function (err, result) {
                                        if(err){
                                            next(err);
                                        }else{
                                            if(result.deletedCount === 1){
                                                res.status(201);
                                                res.send(obj);
                                            }else{
                                                res.status(500);
                                                res.send('An unknown error occurred');
                                            }
                                        }
                                    });
                                }
                                else{
                                    res.status(201);
                                    res.send(obj);
                                }
                            }
                        });
                    }
                });
            }
            else{
                res.status(404);
                res.send(body['identifier'] + " not found");
            }
        }
    });
});

router.patch('/:identifier/:price', cors(app.corsOptions), async function(req, res, next) {
    let q = Coin.Coin.updateOne({identifier: req.params['identifier']}, {price: req.params['price']});
    await q.exec(function(err, result){
        if(err) {
            next(err);
        } else{
            if(result.acknowledged){
                res.status(200);
                res.send(`Price of ${req.params['identifier']} updated to ${req.params['price']}`);
            }
            else{
                res.status(500);
                res.send("An unknown server error occurred");
            }
        }
    });
});

module.exports = router;