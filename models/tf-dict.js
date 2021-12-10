let mongoose = require('mongoose');

const tfdictSchema = new mongoose.Schema({
    identifier: {type: String},
    word: {type: String},
    total: {type: Number, default: 1},
    occurrences: {type: Array}
});

module.exports.TFdict = mongoose.model('TFdict',tfdictSchema);
