const mongoose = require('mongoose')
const cartSchema = new mongoose.Schema({
    user_id:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true, unique:true},
    items:[{product_id:{type:mongoose.Schema.Types.ObjectId, ref:'product',required:true}, quantity:{type:Number,required:true, min:1, default:1},size:{type:String, required:true, trim:true},flavour:{type:String, required:true, trim:true}}],

},{timestamps:true})

const cart = mongoose.model('cart',cartSchema)

module.exports = cart