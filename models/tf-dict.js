let mongoose = require('mongoose');

const tfdictSchema = new mongoose.Schema({
    identifier: {type: String},
    word: {type: String},
    total: {type: Number, default: 1},
    url: {type: String, default: ""},
    timestamp: {type: Date, default: Date.now()}
});

module.exports.TFdict = mongoose.model('TFdict',tfdictSchema);
