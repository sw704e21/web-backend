let mongoose = require('mongoose');

const tfdictSchema = new mongoose.Schema({
    identifier: {type: String},
    word: {type: String},
    total: {type: Number, default: 1},
    occurrences: {type: Array},
    timestamp: {type: Date, default: Date.now()}
});

module.exports.TFdict = mongoose.model('TFdict',tfdictSchema);
