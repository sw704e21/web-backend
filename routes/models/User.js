let mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {type: String},
    source: {type: String},
    following: {type: Number},
    ID: {type: Number}
})


module.exports.User = mongoose.model('User', userSchema)
