let mongoose = require('mongoose');

const sentimentSchema = new mongoose.Schema({
    timestamp: {type: Date, default: Date.now()},
    identifiers: {type: Array, default: []},
    sentiment: {type: Number, default: 0},
    interaction: {type: Number, default: 1},
    url: {type: String, default: ''},
    identifier: {type: String},
    influence: {type: Number, default: 1}
});

module.exports.Sentiment = mongoose.model('Sentiment', sentimentSchema);
