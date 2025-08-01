const mongoose = require('mongoose')
const brandSchema = new mongoose.Schema({
    name:{type:String, required:true, trim:true},
    logo_url:{type:String, required:false, trim:true},
    is_active:{type:Boolean, default:true}
},{timestamps:true})

const brand = mongoose.model('brnad',brandSchema)

module.exports = brand