let mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    identifier: {type: String},
    price_score: {type: Number},
    social_score: {type: Number},
    average_sentiment: {type: Number},
    correlation_rank: {type: Number},
    final_score: {type: Number},
    timestamp: {type: Date, default: Date.now()}
});

module.exports.Score = mongoose.model('Score', scoreSchema);
