let mongoose = require('mongoose')

const sentimentSchema = new mongoose.Schema({
    timestamp: {type: Date, default: Date.now()},
    coin: {type: String},
    sentiment: {type: Number, default: 0},
    interaction: {type: Number, default: 1},
    url: {type: String, default: ''}
});

module.exports.Sentiment = mongoose.model('Sentiment', sentimentSchema);
