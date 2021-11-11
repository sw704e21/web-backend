let express = require('express');
let router = express.Router();
const cors = require("cors");
const Coin = require("../models/Coin");
const app = require("../app");
const {spawn} = require("child_process");

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

router.post('/:name-:ident', cors(app.corsOptions), async function(req, res, next){
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
                        const ls = spawn('python3', [app.crawlerPath + 'src/add_subreddit.py', name])
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
                res.status(204);
                res.send('Successfully deleted ' + del.deletedCount + " objects");
            }
        }
    });
})



module.exports = router;
