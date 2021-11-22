var express = require('express');
var router = express.Router();
let script = require('../app')
const {spawn} = require("child_process");
let app = require('../app');
let cors = require('cors');
const {Sentiment} = require("../models/Sentiment");


router.get('/date', cors(app.corsOptions), function (req, res) {
    let a = new Date(Date.now())
    a.setDate(a.getDate() - 1)
    res.send(JSON.stringify({"date": Date.now()}))
})

router.get('/path', cors(app.corsOptions), function (req, res) {
    const ls = spawn('python', [script.pythonPath + 'test.py', JSON.stringify(req.body)])
    var result = ""
    ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        result += (`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        result += (`stderr: ${data}`);
        console.log(`stderr: ${data}`);
    });

    ls.on('close', (code) =>{
        result += (`child proccess exited with code ${code}`)
        console.log(`child proccess exited with code ${code}`)
    })
    res.send(result)
})

router.delete('/:coin', cors(app.corsOptions),async function (req, res, next) {
    await Sentiment.remove({coin: req.params['coin']}).exec(function(err, delres) {
        if(err) {
            next(err);
        } else {
            res.status(200);
            res.send('Successfully deleted objects:' + delres.deletedCount);
        }
    });

});

router.get('/posts', cors(app.corsOptions), async function (req, res, next) {
    let q = Sentiment.find();
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

router.get('/urls', cors(app.corsOptions), async function(req, res, next) {
    let q = Sentiment.find().select({_id: 0, url: 1});
    await q.exec(function(err, result){
       if (err){
           next(err);
       }
       else{
           res.status(200);
           res.send(result);
       }
    });
})

module.exports = router;
