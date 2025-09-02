const mongoose = require('mongoose')
const productSchema = new mongoose.Schema({
    title:{type:String, required:true, trim:true},
    description:{type:String, required:true},
    flavour:{type:String, required:true, trim:true},
    variants:[{
        price:{type:Number, required:true},
        discounted_price:{type:Number,default:null},
        stock:{type:Number, required:true},
        size:{type:String, required:true},
        images:[{type:String, required:true}]}],
        category_id:{type:mongoose.Schema.Types.ObjectId, ref:'category', required:true},
        brand_id:{type:mongoose.Schema.Types.ObjectId, ref:'brand', required:true},
        is_active:{type:Boolean, default:true}
    },{timestamps:true})

    const product = mongoose.model('product',productSchema)

    module.exports = product