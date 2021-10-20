var express = require('express');
var router = express.Router();


router.get('/date', function (req, res) {
    let a = new Date(Date.now())
    a.setDate(a.getDate() - 1)
    res.send(a)
})

module.exports = router;
