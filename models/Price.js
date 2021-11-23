let mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    identifier: {type: String},
    price: {type: Number},
    timestamp: {type: Date, default: Date.now()}
});

module.exports.Price = mongoose.model('Price', priceSchema);
