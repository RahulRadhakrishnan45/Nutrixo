const mongoose = require('mongoose')
const brandSchema = new mongoose.Schema({
    name:{type:String, required:true, trim:true},
    logo_url:{type:String, required:false, trim:true},
    is_active:{type:Boolean, default:true},
    is_delete:{type:Boolean, default:false}
},{timestamps:true})

const brand = mongoose.model('brand',brandSchema)

module.exports = brand