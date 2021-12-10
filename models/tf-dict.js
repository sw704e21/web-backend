let mongoose = require('mongoose');

const tfdictSchema = new mongoose.Schema({
    identifier: {type: String},
    word: {type: String},
    total: {type: Number},
    occurrences: {type: Array}
});

module.exports.TFdict = mongoose.model('TFdict',tfdictSchema);
