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
    let delres = await Sentiment.remove({coin: req.params['coin']}).exec();
    res.status(204);
    res.send('Successfully deleted objects:' + delres.deletedCount);
});

module.exports = router;
