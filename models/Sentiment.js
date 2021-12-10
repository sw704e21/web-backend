let mongoose = require('mongoose');

const sentimentSchema = new mongoose.Schema({
    timestamp: {type: Date, default: Date.now()},
    identifiers: {type: Array, default: []},
    sentiment: {type: Number, default: 0},
    interaction: {type: Number, default: 1},
    url: {type: String, default: ''},
    influence: {type: Number, default: 1},
    uuid: {type: String, default: ''},
    source: {type: String, default: 'reddit'}
});

module.exports.Sentiment = mongoose.model('Sentiment', sentimentSchema);
