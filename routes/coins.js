var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.send('All of the coin data! :D')
});

router.get('/:name', function (req, res) {
    res.send('You requested: ' +req.params['name'])
});

module.exports = router;
