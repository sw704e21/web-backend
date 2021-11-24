let mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
   name: {type: String},
   identifier: {type: String},
   display_name: {type: String},
   icon: {type: String},
   price: {type: Number, default: 0}
});

module.exports.Coin = mongoose.model('Coin', coinSchema);
