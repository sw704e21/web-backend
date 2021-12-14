let mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
   identifier: {type: String},
   display_name: {type: String},
   icon: {type: String},
   price: {type: Number, default: 0},
   tags: {type: Array, default: []}
});

module.exports.Coin = mongoose.model('Coin', coinSchema);
