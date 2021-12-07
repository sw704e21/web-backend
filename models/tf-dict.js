let mongoose = require('mongoose');

const tfdictSchema = new mongoose.Schema({
    identifier: {type: String},
    TFdict: {type: Object}
});

module.exports.TFdict = mongoose.model('TFdict',tfdictSchema)
