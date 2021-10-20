let express = require('express');
let router = express.Router();
let Sentiment = require('./models/Sentiment')


router.get('/', function (req, res, next) {
    let date = new Date( Date.now());
    date.setDate(date.getDate -1);
    let q = Sentiment.Sentiment.find({timestamp: {$gte: date }});
    q.exec(function (err, result){
        if (err) next(err);
        res.send(result);
    });

});

router.get('/:name', function (req, res) {
    res.send('You requested: ' +req.params['name'])
});

module.exports = router;
